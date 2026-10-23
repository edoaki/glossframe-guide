# GlossFrame Guide

GlossFrameのA（PC）・B（スマホ）共通導入サイトです。

公開先: https://edoaki.github.io/glossframe-guide/

HTML、CSS、JavaScriptと説明用画像だけを配信します。認証やデプロイ操作は利用者のローカルセットアップ画面またはCloudflare公式画面で行い、このサイトでは認証情報を受け取りません。

## ローカル確認

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

## 公開

GitHub PagesのSourceをGitHub Actionsに設定し、mainへのpushで `.github/workflows/pages.yml` を実行します。配信対象はindex.html、mobile-accounts.html、style.css、guide.js、assets、および存在する場合のmobile.htmlです。

対応アプリ: 0.1.0。確認日: 2026-10-23。ローカルセットアップ画面以外の認証スクリーンショットと実機検証は未完了です。Bのコンテンツは実装担当の確認後に組み込みます。
