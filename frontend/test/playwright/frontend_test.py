import requests
import pytest
from playwright.sync_api import Page
import json
import time
import pathlib

FRONTEND_URL = "http://react:3000"
API_ENDPOINT = "http://localhost:8080"
KEYCLOAK = "http://keycloak.test/redirect"

def wait_for_react():
    for _ in range(10):
        try:
            res = requests.get(FRONTEND_URL)
            if res.status_code == 200:
                return
        except:
            pass
        time.sleep(1)
    raise RuntimeError("React app is not up!")

wait_for_react()

login = False

def handle_route(route, request):
    global login
    if "/login_oidc" in request.url:
        login = True
        fake_token= "fake"
        # redirect_url = f"http://react:3000?code=fake-auth-code&access_token={fake_token}"
        redirect_url = FRONTEND_URL + '/redirect'

        route.fulfill(
            status=302,
            headers={"Location": redirect_url}
        )
    elif '/d/' in request.url:
        print("Intercepted:", request.url)
        json_data = []
        with open('/data/datalist.json', 'r') as f:
            json_data = json.load(f)
        route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps(json_data)
        )
    elif '/c/me' in request.url:
        print("Intercepted:", request.url)
        if login:
            route.fulfill(
                status=200,
                content_type='application/json',
                body= 'user1'
            )
        else:
            response_data = {
                "detail": {
                    "command": 'whoami',
                    "message": 'Authentication error',
                    "stdout": "",
                    "stderr": "",
                },
            }
            route.fulfill(
                status=401,
                headers={"Content-Type": "application/json"},
                body=json.dumps(response_data),
            )
    elif "/redirect" in request.url:
        login = True
        fake_token= "fake"
        redirect_url = f"{FRONTEND_URL}?code=fake-auth-code&access_token={fake_token}"
        # redirect_url = KEYCLOAK

        route.fulfill(
            status=301,
            headers={"Location": redirect_url}
        )
    else:
        route.continue_()


# Login Page Display Test

def test_login_title_display(page: Page):
    page.goto(FRONTEND_URL)
    # TODO: タイトル要素を検証
    assert page.locator("#title").inner_text() == "Login"


def test_login_button_display(page: Page):
    page.goto(FRONTEND_URL)
    # TODO: ログインボタンの有無を検証
    assert page.locator("button:has-text('Login with OpenID provider')").is_visible()

# Login Process Test

def test_oidc_login_valid_token(page: Page):
    # TODO: 有効なアクセストークンを使ってログインをモック
    # TODO: ログイン後の状態を確認
    # すべてのリクエストをhandle_routeでモック
    page.route("**/*", lambda route, request: handle_route(route, request))

    # フロントエンドアプリを開く
    page.goto(FRONTEND_URL)

    # ログインボタンをクリック（ナビゲーション待ちはしない）
    with page.expect_navigation():
        page.click("text='Login with OpenID provider'")

    # トークンを取得して表示しているはずの要素を待つ
    page.wait_for_selector(".file-table", timeout=10000)

    file_text = page.locator(".file-table").text_content()
    print(f"File text: {file_text}")

    assert "dir1" in file_text  # 適宜変更

def test_oidc_token_refresh(page: Page):
    # TODO: アクセストークン期限切れ → リフレッシュトークンで再ログイン処理をモック
    # TODO: ログイン状態が維持されているか確認
    # FastAPIで確認
    pass


def test_oidc_all_tokens_expired_redirect(page: Page):
    # TODO: アクセス時にアクセストークンもリフレッシュトークンも失効している状態をモック
    # TODO: 自動的にログイン画面へリダイレクトされるか確認
    # FastAPIで確認
    pass


def test_oidc_invalid_access_token(page: Page):
    # TODO: 不正なアクセストークンを持った状態をモック
    # TODO: ログインに失敗していることを確認
    # FastAPIで確認
    pass


def test_sasl_login_valid_user(page: Page):
    page.goto(FRONTEND_URL)
    # TODO: 正しいユーザー名とパスワードを入力してログイン
    # TODO: ログイン後の画面確認
    pass


def test_sasl_login_invalid_user(page: Page):
    page.goto(FRONTEND_URL)
    # TODO: 間違ったユーザー名/パスワードを入力してログイン失敗を確認
    pass

# Logout Process Test

def test_logout_returns_to_login(page: Page):
    # TODO: 事前にログイン済みにしておく
    # TODO: ログアウトボタンをクリック
    # TODO: ログイン画面に戻っていることを確認
    pass

# File/Directory Display Test

def test_display_file_list_existing_path(page: Page):
    # TODO: 実際のパスにアクセスして、ファイル一覧を確認する
    pass

def test_display_error_on_nonexistent_path(page: Page):
    # TODO: 存在しないディレクトリに移動して、エラーメッセージを確認
    pass

def test_display_large_file_list(page: Page):
    # TODO: たくさんのファイルが表示されるパスでスクロール・表示の確認
    pass

def test_sort_by_filename(page: Page):
    # TODO: ソートボタンを押して、昇順・降順の順番を確認
    pass

def test_sort_by_filesize(page: Page):
    # TODO: サイズソートを押して、サイズ順になっているか確認
    pass

def test_sort_by_modified_time(page: Page):
    # TODO: 更新日時ソートで正しく並び替えられているか
    pass

def test_filter_by_extension(page: Page):
    # TODO: 例えば `.txt` だけフィルターして確認
    pass

def test_filter_by_date_range(page: Page):
    # TODO: 日付フィルターを使って、範囲内のファイルのみが表示されるか
    pass

def test_display_current_directory_path(page: Page):
    # TODO: ナビゲーションバーなどに現在のパスが表示されているか確認
    pass

def test_display_operation_menu(page: Page):
    # TODO: ファイルやフォルダを右クリック（またはメニューアイコン）して操作メニューを確認
    pass

def test_display_action_buttons(page: Page):
    # TODO: コピー、削除、アップロードなどのボタンが正しく表示されるか
    pass

# Path Navigation Test

def test_navigate_by_clicking_directory(page: Page):
    # TODO: ディレクトリをクリック → 移動先のパス確認
    pass

def test_navigate_back_and_forward(page: Page):
    # TODO: 戻る・進むボタンを押して履歴移動確認
    pass

def test_direct_path_access(page: Page):
    # TODO: 入力ボックスにパスを入力してEnter → 該当ディレクトリに遷移するか
    pass

# Detail View Test

def test_display_file_name_in_details(page: Page):
    # TODO: 詳細表示でファイル名が正しく出るか
    pass

def test_display_file_type_in_details(page: Page):
    # TODO: .txt/.zip/.jpg などの種類が正しく表示されるか
    pass

def test_display_file_size_in_details(page: Page):
    # TODO: ファイルサイズ（KB/MB）が正しく表示されるか
    pass

def test_display_permissions_in_details(page: Page):
    # TODO: 例: rwxr-xr-- のような表示を確認
    pass

def test_display_access_time_in_details(page: Page):
    # TODO: アクセス日時（最終アクセス）が正しいか
    pass

def test_display_creation_time_in_details(page: Page):
    # TODO: 作成日時が正しく表示されているか
    pass

def test_display_modified_time_in_details(page: Page):
    # TODO: 最終更新日が正しく出ているか
    pass

def test_display_owner_uid_in_details(page: Page):
    # TODO: 所有者 UID が表示されているか
    pass

def test_display_owner_gid_in_details(page: Page):
    # TODO: 所有者 GID が表示されているか
    pass

# File Content View Test

def test_display_text_file_content(page: Page):
    # TODO: .txt ファイルをクリック → 内容が正しく表示されるか
    pass

def test_display_pdf_file(page: Page):
    # TODO: .pdf ファイルをクリック → ビューアに表示されるか
    pass

def test_display_image_file(page: Page):
    # TODO: .jpg/.png をクリック → 画像が表示されるか
    pass

def test_play_video_file(page: Page):
    # TODO: .mp4 をクリック → 動画プレイヤーで再生されるか
    pass

def test_display_unsupported_file(page: Page):
    # TODO: 未対応の拡張子 → エラーメッセージを表示
    pass

# File Move Test

def test_move_single_file(page: Page):
    # TODO: ファイルを選択 → 移動 → 成功確認
    pass

def test_move_multiple_files(page: Page):
    # TODO: 複数ファイル選択 → 移動 → 全て正しく移動されるか
    pass

def test_move_file_to_nonexistent_path(page: Page):
    # TODO: 無効なパスへ移動 → エラーメッセージ確認
    pass

def test_move_nonexistent_file(page: Page):
    # TODO: 存在しないファイルを移動 → エラー確認
    pass

def test_move_file_name_conflict(page: Page):
    # TODO: 移動先に同名ファイルあり → 上書き確認ダイアログ表示
    pass

# Directory Move Test

def test_move_single_directory(page: Page):
    # TODO: ディレクトリ選択 → 移動 → 成功確認
    pass

def test_move_multiple_directories(page: Page):
    # TODO: 複数ディレクトリ選択 → 移動 → 成功確認
    pass

def test_move_directory_to_nonexistent_path(page: Page):
    # TODO: 無効なパス → エラーメッセージ表示
    pass

def test_move_nonexistent_directory(page: Page):
    # TODO: 存在しないディレクトリ指定 → エラー確認
    pass

def test_move_directory_name_conflict(page: Page):
    # TODO: 同名ディレクトリがある場合 → 上書き確認表示されるか
    pass

# File Deletion Test

# TC-048: ファイル1件を削除できる
def test_delete_single_file(page: Page):
    # TODO: ファイル選択 → 削除 → 削除されたか確認
    pass

# TC-049: 複数ファイルを一括で削除できる
def test_delete_multiple_files(page: Page):
    # TODO: 複数選択 → 一括削除 → 成功確認
    pass

# TC-050: 存在しないファイルを削除しようとするとエラーが表示される
def test_delete_nonexistent_file(page: Page):
    # TODO: 存在しないファイルを削除 → エラーメッセージ
    pass

# Directory Deletion Test

# TC-051: 単体ディレクトリを削除できる
def test_delete_single_directory(page: Page):
    # TODO: ディレクトリ選択 → 削除 → 削除されたか
    pass

# TC-052: 複数ディレクトリを一括で削除できる
def test_delete_multiple_directories(page: Page):
    # TODO: 複数ディレクトリ選択 → 一括削除
    pass

# TC-053: 存在しないディレクトリの削除でエラーが表示される
def test_delete_nonexistent_directory(page: Page):
    # TODO: 存在しないディレクトリ削除 → エラーメッセージ
    pass

# Permission Change Test

# TC-054: 読み取り権限あり → 表示・DL・コピーが可能
def test_read_permission_granted(page: Page):
    # TODO: 表示/ダウンロード/コピーが成功すること
    pass

# TC-055: 読み取り権限なし → 表示・DL・コピーが不可
def test_read_permission_denied(page: Page):
    # TODO: 表示/ダウンロード/コピーがブロックされること
    pass

# TC-056: 書き込み権限あり → アップロード・移動・削除が可能
def test_write_permission_granted(page: Page):
    # TODO: 書き込み系操作ができる
    pass

# TC-057: 書き込み権限なし → アップロード・移動・削除が不可
def test_write_permission_denied(page: Page):
    # TODO: 操作がブロック or エラーになること
    pass

# TC-058: 実行権限あり → 実行可能状態として表示される
def test_execute_permission_granted(page: Page):
    # TODO: 実行可能な表示あり (アイコン or ラベルなど)
    pass

# TC-059: 実行権限なし → 実行不可状態として表示される
def test_execute_permission_denied(page: Page):
    # TODO: 実行不可マーク or グレーアウトなど
    pass

# ACL Change Test

# TC-060: 権限のあるユーザ → 操作が許可される
def test_acl_allowed_user_can_operate(page: Page):
    # TODO: 指定ユーザーでログイン → 操作可
    pass

# TC-061: 権限のあるグループ → 操作が許可される
def test_acl_allowed_group_can_operate(page: Page):
    # TODO: グループ所属ユーザー → 操作可
    pass

# TC-062: 権限のないユーザ → 操作が拒否される
def test_acl_denied_user_cannot_operate(page: Page):
    # TODO: アクセス制限の表示やエラー確認
    pass

# TC-063: 権限のないグループ → 操作が拒否される
def test_acl_denied_group_cannot_operate(page: Page):
    # TODO: グループでもアクセス不可であること
    pass

# Download Test

# TC-064: 単体ファイルのダウンロード
def test_download_single_file(page: Page):
    # TODO: ファイル選択 → ダウンロード → 成功確認（ファイル存在チェック）
    pass

# TC-065: 複数ファイルの一括ダウンロード
def test_download_multiple_files(page: Page):
    # TODO: 複数選択 → 一括DL → zipなどのアーカイブ確認
    pass

# TC-066: 単体ディレクトリのダウンロード
def test_download_single_directory(page: Page):
    # TODO: ディレクトリ選択 → DL → アーカイブ or 構造確認
    pass

# TC-067: 複数ディレクトリを一括でダウンロード
def test_download_multiple_directories(page: Page):
    # TODO: 複数ディレクトリ選択 → DL → zip構造確認
    pass

# TC-068: 多階層ディレクトリの構造保持確認
def test_download_nested_directories(page: Page):
    # TODO: サブディレクトリ含むDL → 解凍して構造チェック
    pass

# TC-069: 空ファイルのダウンロード
def test_download_empty_file(page: Page):
    # TODO: 空のファイル選択 → DL → サイズ0バイトであること確認
    pass

# TC-070: 空ディレクトリのダウンロード
def test_download_empty_directory(page: Page):
    # TODO: 空のフォルダDL → 解凍後に空ディレクトリが含まれているか
    pass

# TC-071: 存在しないパスのダウンロード → エラー表示
def test_download_nonexistent_path(page: Page):
    # TODO: 存在しないファイルをDLしようとする → エラー表示確認
    pass

# TC-072: フロントエンド切断時の挙動
def test_download_frontend_disconnect(page: Page):
    # TODO: DL開始後にページを閉じるなどして切断 → 中断 or エラーメッセージ
    # FastAPIで確認
    pass

# TC-073: バックエンド切断時の挙動
def test_download_backend_disconnect(page: Page):
    # TODO: サーバー停止 or 通信遮断 → エラーハンドリング確認
    pass

# TC-074: ダウンロード途中キャンセル
def test_download_cancel(page: Page):
    # TODO: ダウンロード進行中にキャンセル操作 → 成功中断できるか
    pass

# Upload Test

# TC-075: 単体ファイルのアップロード
def test_upload_single_file(page: Page):
    # TODO: ファイル1つ選択 → 成功確認
    pass

# TC-076: 複数ファイルの一括アップロード
def test_upload_multiple_files(page: Page):
    # TODO: 複数ファイル選択 → 成功確認
    pass

# TC-077: 単体ディレクトリのアップロード
def test_upload_single_directory(page: Page):
    # TODO: webkit/chromium で directory upload に対応してる場合に検討
    pass

# TC-078: 複数ディレクトリのアップロード
def test_upload_multiple_directories(page: Page):
    # TODO: 複数ディレクトリ対応 (通常 input では無理、ドラッグ＆ドロップか FileSystem API 前提)
    pass

# TC-079: 多階層構造が保持されたアップロード
def test_upload_nested_directories(page: Page):
    # TODO: 多階層ディレクトリを zip にして送るなどのケースを想定
    pass

# TC-080: 名前衝突時の上書き確認
def test_upload_name_conflict_prompt(page: Page):
    # TODO: 同名ファイルアップロード時に「上書きしますか？」表示されること
    pass

# TC-081: 空ファイルアップロード
def test_upload_empty_file(page: Page):
    # TODO: サイズ0のファイルアップロード → 成功確認
    pass

# TC-082: 空ディレクトリアップロード
def test_upload_empty_directory(page: Page):
    # TODO: 対応している場合、空ディレクトリも送信可能か検証
    pass

# TC-083: 存在しないファイルのアップロード (異常系)
def test_upload_nonexistent_file(page: Page):
    # TODO: 存在しないファイルを選択しようとしても無効なことを確認
    pass

# TC-084: 存在しないパスにアップロード
def test_upload_to_nonexistent_path(page: Page):
    # TODO: UIで存在しないフォルダにアップしようとするとエラー表示されること
    pass

# TC-085: 単体ファイルのドラッグ&ドロップ
def test_drag_and_drop_single_file(page: Page):
    # TODO: page.dispatch_event("drop", {...}) などを使って再現
    pass

# TC-086: 複数ファイルのドラッグ&ドロップ
def test_drag_and_drop_multiple_files(page: Page):
    # TODO: 上記と同様にファイルを複数ドロップする挙動をエミュレート
    pass

# TC-087: 単体ディレクトリのドラッグ&ドロップ
def test_drag_and_drop_single_directory(page: Page):
    # TODO: Playwrightで完全なディレクトリドラッグ&ドロップの再現はやや難
    pass

# TC-088: 複数ディレクトリのドラッグ&ドロップ
def test_drag_and_drop_multiple_directories(page: Page):
    # TODO: 再現が難しい場合は手動テストを補完してもOK
    pass

# TC-089: ファイル+ディレクトリの混合ドラッグ&ドロップ
def test_drag_and_drop_mixed_content(page: Page):
    # TODO: ファイル・フォルダ混合をドロップ → 成功確認
    pass

# TC-090: 空ファイルのドラッグ&ドロップ
def test_drag_and_drop_empty_file(page: Page):
    # TODO: サイズ0のファイルをdrop → 成功アップロード
    pass

# TC-091: 空ディレクトリのドラッグ&ドロップ
def test_drag_and_drop_empty_directory(page: Page):
    # TODO: dropした空フォルダがアップロードできるか
    pass

# TC-092: フロントエンド切断時のアップロード
def test_upload_frontend_disconnect(page: Page):
    # TODO: アップロード中にページ閉じるなどして切断時の挙動確認
    # FastAPIで確認
    pass

# TC-093: バックエンド切断時のアップロード
def test_upload_backend_disconnect(page: Page):
    # TODO: サーバ停止 or 通信遮断 → エラー or 再試行確認
    pass

# TC-094: アップロード途中キャンセル
def test_upload_cancel(page: Page):
    # TODO: 途中キャンセル操作が可能か・UIに反映されるか
    pass

# gfptar Test

def test_gfptar_single_file(page: Page):
    # TODO: 単体ファイル選択 → gfptar ボタンクリック → tar ファイル生成確認
    pass

def test_gfptar_multiple_files(page: Page):
    # TODO: 複数ファイル選択 → tar 成功確認
    pass

def test_gfptar_single_directory(page: Page):
    # TODO: ディレクトリ指定 → tar ボタンクリック → tar 成功
    pass

def test_gfptar_multiple_directories(page: Page):
    # TODO: 複数ディレクトリ → tar 成功確認
    pass

def test_gfptar_mixed_file_and_directory(page: Page):
    # TODO: ファイル + フォルダ混合で tar 化 → 成功
    pass

def test_gfptar_nonexistent_path(page: Page):
    # TODO: 存在しないパス選択 → エラーメッセージ確認
    pass

def test_gfptar_frontend_disconnect(page: Page):
    # TODO: tar 実行中にページ閉じて中断されることを確認
    # FastAPIで確認
    pass

def test_gfptar_backend_disconnect(page: Page):
    # TODO: tar 中に API 応答が途絶えた場合の挙動（エラー or 停止）
    pass

# TC-103: 長時間実行中にアクセストークンの自動更新
def test_gfptar_token_refresh_during_long_run(page: Page):
    # TODO: 長時間 tar 実行時にトークン期限切れ → リフレッシュ成功して処理継続
    # FastAPIで確認
    pass

# TC-104: gfptar処理キャンセルが可能
def test_gfptar_cancel(page: Page):
    # TODO: tar 中に「キャンセル」操作 → 処理が中断されること
    pass

# TC-105: gfptar中断後に再開できる
def test_gfptar_resume_after_interrupt(page: Page):
    # TODO: 中断状態から再開可能かどうか（再開UIの確認）
    pass

# Copy Test

# TC-106: 単体ファイルのコピー
def test_copy_single_file(page: Page):
    # TODO: ファイル1件選択 → コピー実行 → コピー先にファイル存在を確認
    pass

# TC-107: 複数ファイルのコピー
def test_copy_multiple_files(page: Page):
    # TODO: 複数ファイル選択 → コピー → 正常コピー確認
    pass

# TC-108: 単体ディレクトリのコピー
def test_copy_single_directory(page: Page):
    # TODO: ディレクトリ1件コピー → コピー先に同構造確認
    pass

# TC-109: 複数ディレクトリのコピー
def test_copy_multiple_directories(page: Page):
    # TODO: 複数ディレクトリ選択 → コピー → 全部成功確認
    pass

# TC-110: 階層構造を保ったままコピー
def test_copy_nested_directories(page: Page):
    # TODO: 多階層ディレクトリ選択 → コピー → 構造保持を確認
    pass

# TC-111: 空ファイルのコピー
def test_copy_empty_file(page: Page):
    # TODO: 空ファイルコピー → サイズ・中身確認
    pass

# TC-112: 空ディレクトリのコピー
def test_copy_empty_directory(page: Page):
    # TODO: 空ディレクトリコピー → コピー先に空で存在
    pass

# TC-113: 上書き確認が表示される
def test_copy_overwrite_confirmation(page: Page):
    # TODO: 同名ファイル存在 → コピー → 上書き確認ダイアログ表示
    pass

# TC-114: コピー元が存在しない場合にエラー
def test_copy_nonexistent_source(page: Page):
    # TODO: 存在しないパス指定 → エラー表示を確認
    pass

# Customization Test

# TC-115: リスト形式の切り替え
def test_view_switch_list_mode(page: Page):
    # TODO: 表示モード切り替え → list 表示を確認
    pass

# TC-116: アイコン形式の切り替え
def test_view_switch_icon_mode(page: Page):
    # TODO: アイコン形式へ切り替え → UI確認
    pass

# TC-117: サムネイル形式の切り替え
def test_view_switch_thumbnail_mode(page: Page):
    # TODO: サムネイル表示に切り替え → サムネイル確認
    pass

# TC-118: ダークモード切り替え
def test_toggle_dark_mode(page: Page):
    # TODO: モード切替UI → ダークテーマの class が body に付与される
    pass

# TC-119: ライトモード切り替え
def test_toggle_light_mode(page: Page):
    # TODO: ライトモードに戻す → ライト系クラス付与されてること
    pass


# PWA Test

# TC-120: ホーム画面に追加ボタンの表示
def test_pwa_add_button_visible_on_mobile(page: Page):
    # TODO: モバイルモードでアクセス → 「ホームに追加」ボタンの存在を確認
    pass

# TC-121: ホーム画面への追加プロンプト起動
def test_pwa_add_to_home_prompt(page: Page):
    # TODO: PWA有効環境 → ボタン押下で install prompt 発火
    pass

# TC-122: PWA非対応環境で手順が表示される
def test_pwa_add_to_home_fallback_instruction(page: Page):
    # TODO: 非対応ブラウザで追加ボタン押下 → 手順が UI に表示されること
    pass