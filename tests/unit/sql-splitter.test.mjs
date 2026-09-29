import test from "node:test";
import assert from "node:assert/strict";
import { splitSqlStatements } from "../../lib/shared/sql.ts";

test("splits statements while preserving semicolons inside strings",()=>{
  const rows=splitSqlStatements("INSERT INTO x VALUES ('a;b'); SELECT 1;");
  assert.equal(rows.length,2);
  assert.match(rows[0],/a;b/);
  assert.equal(rows[1],"SELECT 1");
});

test("ignores SQL line comments",()=>{
  const rows=splitSqlStatements("-- comment\nCREATE TABLE x(id TEXT);\n-- next\nSELECT 2;");
  assert.deepEqual(rows,["CREATE TABLE x(id TEXT)","SELECT 2"]);
});

test("supports escaped single quotes",()=>{
  const rows=splitSqlStatements("INSERT INTO x VALUES ('CORE''s portal'); SELECT 3;");
  assert.equal(rows.length,2);
});

test("rejects unterminated SQL strings",()=>{
  assert.throws(()=>splitSqlStatements("INSERT INTO x VALUES ('broken);"),/unterminated/i);
});
