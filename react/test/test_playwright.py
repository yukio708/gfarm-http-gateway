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

@pytest.fixture(scope="session")
def playwright_instance():
    with sync_playwright() as p:
        yield p

def test_mock_api(playwright_instance):
    browser = playwright_instance.chromium.launch(headless=True)
    page = browser.new_page()

    # Intercept and mock the API response
    json_load = {}
    with open('test/data/datalist.json', 'r') as f:
       json_load = json.load(f)
    page.route(API_ENDPOINT + "/d/?a=1&l=1&format=json", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(json_load) 
    ))

    # Navigate to the app
    print("Navigating to app...")
    page.goto(FRONTEND_URL)
    
    # Debug: Check page content
    print("Page content:", page.content())

    # Wait for header and print text
    page.wait_for_selector(".App-header", timeout=10000)
    header_text = page.locator(".App-header").text_content()
    print(f"Header text: {header_text}")

    # Wait for file item to appear
    # file_text = page.locator("text=file2.jpg").text_content()
    file_text = page.locator(".file-table").text_content()
    print(f"File text: {file_text}")

    # Assertion
    assert "file2.jpg" in file_text  # Check if file2.jpg is found in the text

    browser.close()
