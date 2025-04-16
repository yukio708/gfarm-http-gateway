from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import json

def test_homepage():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    driver.get("http://react:3000")  # the service name from docker-compose

    time.sleep(1)

    header = driver.find_element(By.CLASS_NAME, "App-header")
    print(header.text)

    assert header.text == "Hello!"

    driver.quit()

if __name__ == "__main__":
    test_homepage()