from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import time

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client['utkarsh-pr']
collection = db['medicines']

# Setup Selenium Chrome Driver options
chrome_options = Options()
chrome_options.add_argument('--headless')  # Run Chrome in headless mode
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument("--window-size=1920,1080")

# Update this path to where you saved your chromedriver executable
CHROMEDRIVER_PATH = '/path/to/chromedriver'  
service = Service(CHROMEDRIVER_PATH)

driver = webdriver.Chrome(service=service, options=chrome_options)

base_url = 'https://www.1mg.com/drugs-all-medicines'

try:
    for page in range(1, 3):  # scrape first two pages
        url = f"{base_url}?page={page}"
        print(f"Loading page: {url}")
        driver.get(url)

        # Wait to let JavaScript load content - adjust sleep as needed
        time.sleep(5)

        page_html = driver.page_source
        soup = BeautifulSoup(page_html, 'html.parser')

        # Now products are <a> tags with class starting with 'Button__button'
        # Inspect current site and adjust as needed; example uses stable attribute:
        products = soup.find_all('a', class_=lambda x: x and 'button-text' in x)
        
        print(f"Found {len(products)} product anchors on page {page}")

        for a_tag in products:
            link = 'https://www.1mg.com' + a_tag.get('href', '')
            name_div = a_tag.find('div', recursive=False)
            name = name_div.get_text(strip=True) if name_div else ''
            print(f"Processing medicine: {name}")

            # Navigate to the detail page with Selenium (to get JS rendered info)
            driver.get(link)
            time.sleep(5)
            detail_html = driver.page_source
            detail_soup = BeautifulSoup(detail_html, 'html.parser')

            # -- Price --
            price = ""
            price_span = detail_soup.find('span', string=lambda t: t and 'MRP' in t)
            if price_span:
                price = price_span.find_parent().get_text(strip=True).replace('MRP', '')

            # -- Image URL --
            image_url = ""
            img_div = detail_soup.find('div', class_='DrugImages__thumb___2Ywij')
            if img_div:
                img_tag = img_div.find('img')
                if img_tag and img_tag.has_attr('src'):
                    image_url = img_tag['src']

            # -- Manufacturer --
            manufacturer = ""
            manu_div = detail_soup.find('div', string=lambda t: t and 'Manufacturer' in t)
            if manu_div:
                manu_val_div = manu_div.find_next_sibling('div')
                if manu_val_div:
                    manufacturer = manu_val_div.get_text(strip=True)

            # -- Description --
            description = ""
            desc_h2 = detail_soup.find('h2', string=lambda t: t and 'Product introduction' in t)
            if desc_h2:
                desc_div = desc_h2.find_next_sibling('div')
                if desc_div:
                    description = desc_div.get_text(strip=True)

            # -- Uses --
            uses = ""
            uses_heading = detail_soup.find(string=lambda t: t and 'Uses of' in t)
            if uses_heading:
                uses_ul = uses_heading.find_next('ul')
                if uses_ul:
                    uses = uses_ul.get_text(separator=', ', strip=True)

            # -- Side Effects --
            side_effects = ""
            side_heading = detail_soup.find(string=lambda t: t and 'Common side effects' in t)
            if side_heading:
                se_ul = side_heading.find_next('ul')
                if se_ul:
                    side_effects = se_ul.get_text(separator=', ', strip=True)

            # -- Composition --
            composition = ""
            comp_heading = detail_soup.find(string=lambda t: t and 'Composition' in t)
            if comp_heading:
                comp_info = comp_heading.find_next(['div', 'ul', 'table'])
                if comp_info:
                    composition = comp_info.get_text(separator=', ', strip=True)

            # -- Quick Tips --
            quick_tips = ""
            tips_heading = detail_soup.find(string=lambda t: t and 'Quick tips' in t)
            if tips_heading:
                tips_ul = tips_heading.find_next('ul')
                if tips_ul:
                    quick_tips = tips_ul.get_text(separator='\n- ', strip=True)
                    quick_tips = '- ' + quick_tips if quick_tips else ''

            document = {
                "name": name,
                "link": link,
                "manufacturer": manufacturer,
                "price": price,
                "image_url": image_url,
                "description": description,
                "uses": uses,
                "side_effects": side_effects,
                "composition": composition,
                "quick_tips": quick_tips,
            }
            print("Document:", document)

            try:
                res = collection.insert_one(document)
                print(f"Inserted: {name} (ID: {res.inserted_id})")
            except Exception as e:
                print(f"Error inserting {name}: {e}")

            # Be polite and avoid quick calls; sleep if needed
            time.sleep(2)

        print(f"Page {page} done.")
        time.sleep(3)

finally:
    driver.quit()
    client.close()
    print("Scraping completed.")
