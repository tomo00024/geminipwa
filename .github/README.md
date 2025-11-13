# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

「一枚絵」機能の要件定義

1. 基本原則：独立した最前面レイヤー
   「一枚絵」は、既存の「背景」と「人物」とは完全に独立した、常に最前面に表示される画像レイヤーです。
   画面の重なり順は、[奥] 背景 → 人物 → 一枚絵 [手前] となります。
   「一枚絵」の表示・非表示は、「背景」「人物」の表示状態に一切影響を与えず、また影響も受けません。
2. 表示・変更に関するルール
   これらのルールは、主に同一のAI応答メッセージ内での挙動を定義します。
   ルールA：表示の開始
   AIの応答メッセージ内に {{一枚絵: 値}} というコマンドが含まれるページに到達した瞬間に、指定された一枚絵が表示されます。
   ルールB：表示の継続
   一度表示された一枚絵は、後述の「非表示ルール」が適用されるまで、同一応答内の後続ページで画像指定がなくても表示され続けます。
   例えば、3ページ目で一枚絵が表示された後、5ページ目で背景・人物が変更されても、一枚絵は表示されたままです。画面は「新しい背景・人物」の上に「既存の一枚絵」が重なった状態になります。
   ルールC：一枚絵の上書き
   ある一枚絵が表示されている状態で、後続のページで別の {{一枚絵: ...}} コマンドが現れた場合、古い一枚絵は非表示になり、新しい一枚絵に差し替わります。
3. 非表示に関するルール（最重要）
   このルールは、主にAIとの応答が切り替わる際の挙動を定義します。
   ルールD：新しい応答によるリセット判定
   前提: 以前の応答によって、一枚絵が表示されている状態。
   トリガー: ユーザーがメッセージを送信し、AIから新しい応答が返ってくる。
   判定タイミング: ユーザーが新しい応答のページをめくっていき、最初に出会う画像指定コマンド（背景, 人物, 一枚絵のいずれか）が処理される瞬間。
   条件とアクション:
   もし、その「最初の画像指定コマンド」が 背景 または 人物 であった場合
   → その瞬間に、表示され続けていた古い一枚絵は非表示になります。
   もし、その「最初の画像指定コマンド」が 一枚絵 であった場合
   → ルールCに基づき、古い一枚絵は新しい一枚絵に**上書き（差し替え）**されます。
   もし、新しい応答メッセージ内に画像指定コマンドが一つも存在しない場合
   → 古い一枚絵は表示されたままとなります。
