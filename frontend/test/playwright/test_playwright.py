import requests
import pytest
from playwright.sync_api import sync_playwright
import json
import time

FRONTEND_URL = "http://react:3000"
API_ENDPOINT = "http://localhost:8080"

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

def handle_route(route, request):
    if '/dir1' in request.url:
        print("dir1 Intercepted:", request.url)
        json_data = []
        with open('/data/datalist2.json', 'r') as f:
            json_data = json.load(f)
        route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps(json_data)
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
    else:
        route.continue_()

@pytest.fixture(scope="session")
def playwright_instance():
    with sync_playwright() as p:
        yield p

def test_mock_api(playwright_instance):
    browser = playwright_instance.chromium.launch(headless=False)
    page = browser.new_page()

    # Intercept and mock the API response
    page.route("**/*", handle_route)

    # Navigate to the app
    print("Navigating to app...")
    page.goto(FRONTEND_URL)
    
    # Debug: Check page content
    # print("Page content:", page.content())

    # Wait for header and print text
    page.wait_for_selector(".App-header", timeout=10000)
    header_text = page.locator(".App-header").text_content()
    print(f"Header text: {header_text}")

    # Wait for file item to appear
    # file_text = page.locator("text=file2.jpg").text_content()
    file_text = page.locator(".file-table").text_content()
    print(f"File text: {file_text}")

    page.wait_for_selector("text=dir1", timeout=10000)
    # Assertion
    assert "dir1" in file_text  # Check if file2.jpg is found in the text

    page.click("text=dir1")
    
    page.wait_for_selector("text=dir1", timeout=10000)
    file_text = page.locator(".file-table").text_content()
    print(f"File text: {file_text}")

    assert "dir1" in file_text  # Check if file2.jpg is found in the text

    browser.close()
