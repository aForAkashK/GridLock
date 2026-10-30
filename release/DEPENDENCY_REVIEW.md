# Dependency review — 2026-10-26

Compatible patches updated the affected grpc, shell-quote, body-parser, compression, launch-editor, joi and image inspection tooling. Navigation core7.24 removes query-string and the vulnerable decode-uri-component dependency. No new app package or native package version was introduced. The grpc override is compatible with existing API use; platform Firebase still runs through the existing native modules.

Latest `npm audit --omit=dev`: **1 high, 0 critical, 0 moderate**. Remaining `image-size@1.2.1` is pulled by React Native's CLI/Metro build tooling. Advisories GHSA-5p2g-fcmc-qvqq and GHSA-w3rx-r6r6-pgpr concern malformed JXL/HEIF/ICNS image parsing. This is not a mobile runtime parser; content delivery accepts JSON only and does not download artwork. Only trusted repository assets should enter the build. Version2 changes the API expected by Metro, so no unsafe forced-major override was applied. Track a compatible upstream Metro fix before treating this as resolved. A nonzero audit result is therefore expected and is not described as clean.

R8 also reports upstream Google Play Services stack-map warnings; the signed build succeeds. Interactive Google sign-in remains an acceptance test, rather than inferring success from compilation.


Ads dependency update (2026-10-28): added pinned react-native-google-mobile-ads17.4.0 with two small JS dependencies and native Google Ads/UMP SDKs. The complete current audit reports3 high advisories across brace-expansion, image-size and zod in existing lint/Jest/Metro tooling; npm dependency tracing shows these are not introduced by the ads runtime dependency. No force-major audit fix was applied. Track compatible tooling updates separately. Native minified startup is explicitly smoke-tested after the narrow Room constructor keep rule and on-demand WorkManager setup.
