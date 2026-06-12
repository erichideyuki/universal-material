---
"@universal-material/web": patch
---

Fix the top app bar losing its on-scroll background on md+ viewports — a docs-layout-motivated media query defaulted the scrolled color to transparent on desktop, so content scrolled visibly underneath the bar. The bar now always defaults to `surface-container` when scrolled; layouts that want a transparent bar can set `--u-top-app-bar-on-scroll-container-color`.
