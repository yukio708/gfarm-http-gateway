import requests
import pytest
from playwright.sync_api import sync_playwright
import json
import time
import urllib.parse

FRONTEND_URL = "http://react:3000"
API_ENDPOINT = "http://localhost:8080"
KEYCLOAK = "http://keycloak.test/redirect"

redirect_url = None

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

@pytest.fixture(scope="session")
def playwright_instance():
    with sync_playwright() as p:
        yield p

def test_oidc_login_mock(playwright_instance):
    browser = playwright_instance.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()

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

    browser.close()
