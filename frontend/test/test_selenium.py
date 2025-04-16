import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json
import requests
import requests_mock

FRONTEND_URL = "http://localhost:3000"
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

@pytest.fixture
def requests_mock_instance():
    with requests_mock.Mocker() as mock:
        yield mock

@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    yield driver
    driver.quit()

def test_homepage(driver):
    driver.get(FRONTEND_URL)  # the service name from docker-compose

    time.sleep(1)

    header = driver.find_element(By.CLASS_NAME, "App-header")
    print("header.text", header.text)

    assert header.text == "Hello!"

# Correct test function with the fixture
def test_data_is_displayed_from_mocked_api(driver, requests_mock_instance):
    json_load = {}
    with open('./data/datalist.json', 'r') as f:
        json_load = json.load(f)
    
    # Mock the API response
    requests_mock_instance.get(API_ENDPOINT + "/d/?a=1&l=1&format=json", json=json_load)

    # Open the frontend URL
    driver.get(FRONTEND_URL)

    # Wait for the data container to appear
    data_container = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, f'file-table'))
    )
    print("data_container:", data_container.text)

    # Check if the mocked data appears on the page
    assert json_load[1]["name"] in data_container.text
