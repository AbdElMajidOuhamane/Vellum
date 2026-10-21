#!/bin/sh
# ff <= 0.1.x leaves pending fs errors that abort the next module import, so
# run every suite in its own runtime (matches ff's own test harness).
cd "$(dirname "$0")/.." || exit 1
FF=${FF:-ff}
fail=0
for t in test/*.test.js; do
  if "$FF" "$t"; then
    echo "OK   $t"
  else
    echo "FAIL $t"
    fail=1
  fi
done
if [ "$fail" -eq 0 ]; then
  echo "all suites passed"
fi
exit $fail
