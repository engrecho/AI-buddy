#!/bin/bash
# ============================================================
# AI-Buddy - 通用运维 Webhook 脚本
#
# 与 pull.sh（完整部署）配合，提供单点运维操作。
# 通过宝塔 WebHook 插件触发：
#   1. 在宝塔 WebHook 中新建 hook
#   2. 执行脚本填写：bash /www/wwwroot/buddy.bajiaolu.cn/deploy/ops.sh "$1"
#   3. 访问生成的 URL，通过 ?param=<action> 传参
#
# 用法（命令行测试）：
#   bash ops.sh status
#   bash ops.sh restart
#   bash ops.sh migrate
#   bash ops.sh migrate migrate-add-rss.sql
#   bash ops.sh logs 200
#   bash ops.sh backup
#   bash ops.sh pull
#   bash ops.sh help
#
# 通过 webhook 触发：
#   curl "https://buddy.bajiaolu.cn/<webhook_path>?id=<hook_id>&param=status"
#   curl "https://buddy.bajiaolu.cn/<webhook_path>?id=<hook_id>&param=restart"
# ============================================================

set -u  # 引用未定义变量报错；不用 -e 让单步失败不退出

ACTION="${1:-help}"
EXTRA_ARG="${2:-}"  # 给 migrate 指定 sql 文件名 / 给 logs 指定行数

PROJECT_DIR="/www/wwwroot/buddy.bajiaolu.cn"
LOG_FILE="/www/wwwlogs/buddy-ops.log"
BACKUP_DIR="/www/backup"
MIGRATE_DIR="$PROJECT_DIR/deploy"
APPLIED_FILE="$MIGRATE_DIR/.applied_migrations"

# ── 加载 nvm ─────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null

# ── 加载 .env（拿 DB 凭据） ─────────────────────────────────
DB_USER="${DB_USER:-buddy}"
DB_NAME="${DB_NAME:-buddy}"
DB_PASSWORD="${DB_PASSWORD:-}"
if [ -z "$DB_PASSWORD" ]; then
  if [ -f "$PROJECT_DIR/.env" ]; then
    set -a; . "$PROJECT_DIR/.env"; set +a
  elif [ -f "$PROJECT_DIR/server/.env" ]; then
    set -a; . "$PROJECT_DIR/server/.env"; set +a
  fi
  DB_USER="${DB_USER:-buddy}"
  DB_NAME="${DB_NAME:-buddy}"
  DB_PASSWORD="${DB_PASSWORD:-}"
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 把日志同时写到 stdout 和文件（宝塔 webhook 会把 stdout 作为响应返回）
tee_log() {
  while IFS= read -r line; do
    echo "$line"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line" >> "$LOG_FILE" 2>/dev/null || true
  done
}

# ── 帮助 ─────────────────────────────────────────────────────
show_help() {
  cat <<EOF
AI-Buddy Ops Webhook
用法: bash ops.sh <action> [extra]

可用操作:
  status                  查看 PM2 状态、Git 版本、关键表是否就绪
  restart                 重启 PM2 后端（保留环境变量）
  reload                  热重载 PM2（不杀进程，仅重新加载代码）
  migrate [sql_file]      跑 SQL 迁移；不指定则跑所有未应用的 migrate-*.sql
  logs [lines]             查看后端日志，默认 100 行
  pm2-logs [lines]        查看原始 PM2 日志，默认 100 行
  backup                  备份数据库到 $BACKUP_DIR
  pull                    只 git pull（不 build 不重启）
  build                   只 build 前端（不重启后端）
  install                 安装依赖（前端 + 后端）
  flush-logs              清空 PM2 日志（日志过大时用）
  health                  调用 /api/health 接口验证后端可达
  table-check             检查所有业务表是否存在
  rss-refresh             手动触发一次所有 RSS 源的抓取（curl 调用 /api/rss 内部接口需登录，这里只重启让定时器立即跑）
  help                    显示此帮助

示例:
  bash ops.sh status
  bash ops.sh migrate migrate-add-rss.sql
  bash ops.sh logs 200
  bash ops.sh restart

通过 webhook 触发（宝塔 WebHook 插件 URL）:
  curl "https://buddy.bajiaolu.cn/<hook_path>?id=<hook_id>&param=status"
EOF
}

# ── status ───────────────────────────────────────────────────
do_status() {
  log "===== AI-Buddy 服务状态 =====" | tee_log
  echo "" | tee_log

  # 1. Git 信息
  log "[1/6] Git 版本:" | tee_log
  cd "$PROJECT_DIR" 2>/dev/null && {
    git log -1 --format="  当前: %h  作者: %an  时间: %ci" 2>/dev/null | tee_log
    git log -1 --format="  备注: %s" 2>/dev/null | tee_log
    LOCAL_HASH=$(git rev-parse --short HEAD 2>/dev/null)
    REMOTE_HASH=$(git ls-remote origin main 2>/dev/null | head -1 | awk '{print substr($1,1,7)}')
    if [ -n "$REMOTE_HASH" ]; then
      if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
        log "  与远端一致: $LOCAL_HASH" | tee_log
      else
        log "  ⚠ 本地 $LOCAL_HASH 与远端 $REMOTE_HASH 不一致，建议 pull" | tee_log
      fi
    fi
  } || log "  ✗ 项目目录不存在" | tee_log
  echo "" | tee_log

  # 2. PM2 状态
  log "[2/6] PM2 进程:" | tee_log
  pm2 list 2>/dev/null | grep -E "(name|ai-buddy|online|stopped|errored)" | tee_log || log "  pm2 命令不可用" | tee_log
  echo "" | tee_log

  # 3. 后端健康检查
  log "[3/6] 后端健康检查:" | tee_log
  HEALTH=$(curl -s --max-time 3 http://127.0.0.1:3000/api/health 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    log "  ✓ 后端响应: $HEALTH" | tee_log
  else
    log "  ✗ 后端无响应（端口 3000）" | tee_log
  fi
  echo "" | tee_log

  # 4. 数据库连接 + 关键表
  log "[4/6] 数据库表检查:" | tee_log
  if [ -n "$DB_PASSWORD" ]; then
    TABLES=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SHOW TABLES" 2>/dev/null)
    if [ -n "$TABLES" ]; then
      for t in users tasks memos reading_items rss_sources rss_articles; do
        if echo "$TABLES" | grep -qx "$t"; then
          log "  ✓ $t" | tee_log
        else
          log "  ✗ $t (缺失)" | tee_log
        fi
      done
      echo "" | tee_log
      log "  RSS 源数量:" | tee_log
      mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT COUNT(*) FROM rss_sources" 2>/dev/null | sed 's/^/    /' | tee_log
      log "  RSS 文章数量:" | tee_log
      mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT COUNT(*) FROM rss_articles" 2>/dev/null | sed 's/^/    /' | tee_log
    else
      log "  ✗ 数据库连接失败或为空" | tee_log
    fi
  else
    log "  ⚠ 未配置 DB_PASSWORD，跳过" | tee_log
  fi
  echo "" | tee_log

  # 5. 部署日志最后几行
  log "[5/6] 部署日志尾部（buddy-deploy.log）:" | tee_log
  if [ -f "/www/wwwlogs/buddy-deploy.log" ]; then
    tail -5 /www/wwwlogs/buddy-deploy.log 2>/dev/null | sed 's/^/  /' | tee_log
  else
    log "  无部署日志" | tee_log
  fi
  echo "" | tee_log

  # 6. 磁盘 / 内存
  log "[6/6] 系统资源:" | tee_log
  df -h /www 2>/dev/null | tail -1 | awk '{print "  磁盘: " $3 " 已用 / " $2 " 总量 (使用率 " $5 ")"}' | tee_log
  free -m 2>/dev/null | awk '/^Mem:/ {print "  内存: " $3 "MB 已用 / " $2 "MB 总量"}' | tee_log
  echo "" | tee_log

  log "===== 状态检查完成 =====" | tee_log
}

# ── restart ──────────────────────────────────────────────────
do_restart() {
  log "===== 重启 PM2 后端 =====" | tee_log
  cd "$PROJECT_DIR" 2>/dev/null || { log "✗ 目录不存在" | tee_log; return 1; }

  log "→ delete + start ai-buddy-api..." | tee_log
  pm2 delete ai-buddy-api 2>/dev/null | sed 's/^/  /' | tee_log || true
  pm2 start ecosystem.config.cjs --update-env 2>&1 | sed 's/^/  /' | tee_log
  pm2 save 2>&1 | sed 's/^/  /' | tee_log

  sleep 2
  log "→ 验证启动:" | tee_log
  HEALTH=$(curl -s --max-time 5 http://127.0.0.1:3000/api/health 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    log "  ✓ 后端已启动: $HEALTH" | tee_log
  else
    log "  ✗ 后端 5 秒后仍无响应，请查 pm2 logs" | tee_log
    pm2 logs ai-buddy-api --nostream --lines 20 2>&1 | sed 's/^/  /' | tee_log
  fi
  log "===== 重启完成 =====" | tee_log
}

# ── reload ────────────────────────────────────────────────────
do_reload() {
  log "→ PM2 reload（热重载）..." | tee_log
  pm2 reload ecosystem.config.cjs --update-env 2>&1 | sed 's/^/  /' | tee_log
  pm2 save 2>&1 | sed 's/^/  /' | tee_log
  sleep 2
  HEALTH=$(curl -s --max-time 3 http://127.0.0.1:3000/api/health 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    log "✓ reload 成功: $HEALTH" | tee_log
  else
    log "✗ reload 后无响应" | tee_log
  fi
}

# ── migrate ───────────────────────────────────────────────────
do_migrate() {
  log "===== SQL 迁移 =====" | tee_log
  cd "$MIGRATE_DIR" 2>/dev/null || { log "✗ 迁移目录不存在" | tee_log; return 1; }
  touch "$APPLIED_FILE"

  if [ -n "$EXTRA_ARG" ]; then
    # 指定文件
    SQL_FILE="$MIGRATE_DIR/$EXTRA_ARG"
    if [ ! -f "$SQL_FILE" ]; then
      log "✗ 文件不存在: $EXTRA_ARG" | tee_log
      return 1
    fi
    log "→ 应用迁移: $EXTRA_ARG" | tee_log
    if mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_FILE" 2>&1 | sed 's/^/  /' | tee_log; then
      if ! grep -qx "$EXTRA_ARG" "$APPLIED_FILE" 2>/dev/null; then
        echo "$EXTRA_ARG" >> "$APPLIED_FILE"
      fi
      log "✓ 完成: $EXTRA_ARG" | tee_log
    else
      log "✗ 失败: $EXTRA_ARG" | tee_log
    fi
    return
  fi

  # 跑所有未应用的
  shopt -s nullglob
  for sql_file in "$MIGRATE_DIR"/migrate-*.sql; do
    fname=$(basename "$sql_file")
    if ! grep -qx "$fname" "$APPLIED_FILE" 2>/dev/null; then
      log "→ 应用: $fname" | tee_log
      if mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$sql_file" 2>&1 | sed 's/^/  /' | tee_log; then
        echo "$fname" >> "$APPLIED_FILE"
        log "  ✓ $fname 成功" | tee_log
      else
        log "  ✗ $fname 失败" | tee_log
      fi
    else
      log "  · $fname 已应用，跳过" | tee_log
    fi
  done
  shopt -u nullglob
  log "===== 迁移完成 =====" | tee_log
}

# ── logs ─────────────────────────────────────────────────────
do_logs() {
  LINES="${EXTRA_ARG:-100}"
  log "===== PM2 日志（最后 $LINES 行）=====" | tee_log
  pm2 logs ai-buddy-api --nostream --lines "$LINES" 2>&1 | sed 's/^/  /' | tee_log
  log "===== 日志结束 =====" | tee_log
}

# ── pm2-logs（原始） ──────────────────────────────────────────
do_pm2_logs() {
  LINES="${EXTRA_ARG:-100}"
  log "===== 原始 PM2 日志（最后 $LINES 行）=====" | tee_log
  cat ~/.pm2/logs/ai-buddy-api-out.log 2>/dev/null | tail -n "$LINES" | sed 's/^/  /' | tee_log
  cat ~/.pm2/logs/ai-buddy-api-error.log 2>/dev/null | tail -n "$LINES" | sed 's/^/  [ERR] /' | tee_log
  log "===== 日志结束 =====" | tee_log
}

# ── backup ───────────────────────────────────────────────────
do_backup() {
  log "===== 备份数据库 =====" | tee_log
  mkdir -p "$BACKUP_DIR" 2>/dev/null
  BACKUP_FILE="$BACKUP_DIR/buddy_$(date +%Y%m%d_%H%M%S).sql.gz"
  log "→ 备份到: $BACKUP_FILE" | tee_log
  if mysqldump -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "  ✓ 备份完成 ($SIZE)" | tee_log
    # 只保留最近 7 个备份
    ls -t "$BACKUP_DIR"/buddy_*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null
    log "  已保留最近 7 个备份" | tee_log
    log "  现有备份:" | tee_log
    ls -lh "$BACKUP_DIR"/buddy_*.sql.gz 2>/dev/null | awk '{print "    " $9 " (" $5 ")"}' | tee_log
  else
    log "  ✗ 备份失败" | tee_log
  fi
  log "===== 备份完成 =====" | tee_log
}

# ── pull only ────────────────────────────────────────────────
do_pull() {
  log "===== Git Pull（不 build 不重启）=====" | tee_log
  cd "$PROJECT_DIR" 2>/dev/null || { log "✗ 目录不存在" | tee_log; return 1; }
  git fetch --all 2>&1 | sed 's/^/  /' | tee_log
  git reset --hard origin/main 2>&1 | sed 's/^/  /' | tee_log
  log "→ 当前版本:" | tee_log
  git log -1 --format="  %h  %ci  %s" 2>/dev/null | tee_log
  log "===== Pull 完成 =====" | tee_log
}

# ── build ────────────────────────────────────────────────────
do_build() {
  log "===== 仅 build 前端 =====" | tee_log
  cd "$PROJECT_DIR" 2>/dev/null || { log "✗ 目录不存在" | tee_log; return 1; }
  yarn build 2>&1 | tail -10 | sed 's/^/  /' | tee_log
  log "===== Build 完成 =====" | tee_log
}

# ── install ──────────────────────────────────────────────────
do_install() {
  log "===== 安装依赖 =====" | tee_log
  cd "$PROJECT_DIR" 2>/dev/null || { log "✗ 目录不存在" | tee_log; return 1; }
  log "→ 前端依赖..." | tee_log
  yarn install --silent 2>&1 | sed 's/^/  /' | tee_log
  log "→ 后端依赖..." | tee_log
  cd "$PROJECT_DIR/server" && yarn install --silent 2>&1 | sed 's/^/  /' | tee_log
  log "===== 安装完成 =====" | tee_log
}

# ── flush-logs ───────────────────────────────────────────────
do_flush_logs() {
  log "→ 清空 PM2 日志..." | tee_log
  pm2 flush ai-buddy-api 2>&1 | sed 's/^/  /' | tee_log
  log "✓ 已清空" | tee_log
}

# ── health ───────────────────────────────────────────────────
do_health() {
  log "→ 健康检查..." | tee_log
  HEALTH=$(curl -s --max-time 5 http://127.0.0.1:3000/api/health 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    log "✓ 后端响应: $HEALTH" | tee_log
  else
    log "✗ 后端无响应" | tee_log
  fi
}

# ── table-check ──────────────────────────────────────────────
do_table_check() {
  log "→ 检查业务表..." | tee_log
  TABLES=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SHOW TABLES" 2>/dev/null)
  if [ -z "$TABLES" ]; then
    log "✗ 数据库连接失败" | tee_log
    return 1
  fi
  for t in users api_keys tasks task_groups task_members task_tags task_comments memos task_notes reading_items quick_notes rss_sources rss_articles; do
    if echo "$TABLES" | grep -qx "$t"; then
      log "  ✓ $t" | tee_log
    else
      log "  ✗ $t 缺失" | tee_log
    fi
  done
}

# ── rss-refresh ──────────────────────────────────────────────
# 没办法直接调 /api/rss 接口（需要登录），这里通过重启后端让定时器立即跑一次
do_rss_refresh() {
  log "→ 触发 RSS 抓取（重启后端让定时器立即跑）..." | tee_log
  do_restart
  log "→ 等待 15 秒让首次抓取完成..." | tee_log
  sleep 15
  log "→ 当前 RSS 文章数:" | tee_log
  mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT COUNT(*) FROM rss_articles" 2>/dev/null | sed 's/^/  /' | tee_log
}

# ── 主入口 ───────────────────────────────────────────────────
log "========== ops.sh action=$ACTION ==========" | tee_log

case "$ACTION" in
  status)        do_status ;;
  restart)       do_restart ;;
  reload)        do_reload ;;
  migrate)       do_migrate ;;
  logs)          do_logs ;;
  pm2-logs)      do_pm2_logs ;;
  backup)        do_backup ;;
  pull)          do_pull ;;
  build)         do_build ;;
  install)       do_install ;;
  flush-logs)    do_flush_logs ;;
  health)        do_health ;;
  table-check)   do_table_check ;;
  rss-refresh)   do_rss_refresh ;;
  help|--help|-h|"") show_help ;;
  *) log "✗ 未知 action: $ACTION（试试 help）" | tee_log; show_help ;;
esac

log "========== ops.sh 完成 ==========" | tee_log
