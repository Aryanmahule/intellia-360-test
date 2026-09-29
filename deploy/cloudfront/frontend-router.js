// CloudFront Function — viewer request — runtime cloudfront-js-2.0
//
// Maps clean URLs onto the files `next build` exports to S3 (apps/frontend/out):
//
//   /                                  → /index.html
//   /login                             → /login.html
//   /student/lesson/counting-up-to-100 → /student/lesson/_.html
//   /student/lesson/abc.txt            → /student/lesson/_.txt       (router data)
//   /student/lesson/abc/__next.….txt   → /student/lesson/_/__next.….txt
//   /_next/static/…, /assets/…         → unchanged
//
// Dynamic routes ([id], [gradeId], …) are exported once, for the placeholder
// id "_" (apps/frontend/src/lib/route-placeholder.ts); every real id is served
// that shell and the page reads the id from the address bar.
//
// Keep DYNAMIC_ROUTES in step with apps/frontend/src/app. The frontend build
// verifies it: `npm run check:routes -w @intellia360/frontend` fails when a
// dynamic route or a static page beside one is missing here.
//
// Plain ES5-style code: CloudFront Functions run a restricted JavaScript
// runtime. The same file is loaded by the local check, so it must stay free of
// `export`/`require`.

var PLACEHOLDER = "_";

var DYNAMIC_ROUTES = [
  // prefix segments, number of dynamic segments, static pages that share the prefix
  { prefix: ["student", "lesson"], params: 1, staticPages: ["architecture", "edunotes", "video"] },
  { prefix: ["student", "quiz"], params: 1, staticPages: [] },
  { prefix: ["teacher", "classes"], params: 1, staticPages: [] },
  { prefix: ["editor", "curriculum"], params: 1, staticPages: [] },
  { prefix: ["editor", "lessons"], params: 2, staticPages: [] },
];

function splitExtension(segment) {
  var match = segment.match(/^(.*?)(\.html|\.txt)$/);
  return match ? [match[1], match[2]] : [segment, ""];
}

function startsWithPrefix(segments, prefix) {
  if (segments.length <= prefix.length) return false;
  for (var i = 0; i < prefix.length; i++) {
    if (segments[i] !== prefix[i]) return false;
  }
  return true;
}

function rewriteDynamicSegments(segments) {
  for (var r = 0; r < DYNAMIC_ROUTES.length; r++) {
    var route = DYNAMIC_ROUTES[r];
    if (!startsWithPrefix(segments, route.prefix)) continue;

    for (var p = 0; p < route.params; p++) {
      var index = route.prefix.length + p;
      if (index >= segments.length) break;

      var parts = splitExtension(segments[index]);
      var name = parts[0];
      // Already the placeholder, Next.js router files, or an empty segment.
      if (name === PLACEHOLDER || name === "" || name.indexOf("__next") === 0) break;
      // A static page that shares the prefix (/student/lesson/video).
      if (p === 0 && route.staticPages.indexOf(name) !== -1) break;

      segments[index] = PLACEHOLDER + parts[1];
      if (parts[1] !== "") break; // "<id>.txt" ends the path
    }
    return segments;
  }
  return segments;
}

function rewriteUri(uri) {
  if (uri === "/" || uri === "") return "/index.html";
  if (uri.length > 1 && uri.charAt(uri.length - 1) === "/") uri = uri.slice(0, -1);

  var segments = rewriteDynamicSegments(uri.split("/").slice(1));
  var last = segments[segments.length - 1];
  var rewritten = "/" + segments.join("/");

  // Pages have no extension in the URL; their file is <path>.html.
  return last.indexOf(".") === -1 ? rewritten + ".html" : rewritten;
}

function handler(event) {
  var request = event.request;
  request.uri = rewriteUri(request.uri);
  return request;
}
