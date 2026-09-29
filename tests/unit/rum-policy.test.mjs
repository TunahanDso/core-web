import test from "node:test";
import assert from "node:assert/strict";
import { rumSurfaceForPath,sanitizeRumPath,validRumMetric } from "../../lib/platform/rum.ts";

test("classifies route surfaces",()=>{
  assert.equal(rumSurfaceForPath("/portal/tasks"),"portal");
  assert.equal(rumSurfaceForPath("/admin/members"),"admin");
  assert.equal(rumSurfaceForPath("/tr"),"public");
});

test("redacts uuid-like and long dynamic path segments",()=>{
  assert.equal(
    sanitizeRumPath("/portal/library/9d0f5c4c-b5e3-464c-9a38-70b22303d453?download=1"),
    "/portal/library/:id"
  );
  assert.equal(sanitizeRumPath("/portal/repositories/abcdefghijklmnopqrstuvwxyz123456"),"/portal/repositories/:id");
});

test("validates bounded web-vital metrics",()=>{
  assert.equal(validRumMetric("LCP",2200),true);
  assert.equal(validRumMetric("NOPE",20),false);
  assert.equal(validRumMetric("CLS",-1),false);
});
