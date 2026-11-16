#!/usr/bin/env bash
# يطبّق الترحيلات على قاعدة PostgreSQL محلية (مع محاكاة بسيطة لـ auth/storage) ثم يشغّل اختبارات RLS.
# الاستخدام:  PGHOST=/var/tmp/pgt PGPORT=54329 PGUSER=postgres bash scripts/local-db-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists sl_test" -c "create database sl_test"
$P -d sl_test -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do echo "== $f"; $P -d sl_test -f "$f" 2>&1 | grep -v NOTICE || true; done
psql -d sl_test -f supabase/tests/rls_tests.sql 2>&1 | grep -v -E "^(BEGIN|CREATE|GRANT|ROLLBACK)"
