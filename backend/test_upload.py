import requests

with open('demo.jpg', 'wb') as f:
    f.write(b'fake_jpeg_data')

# 1. Login
r = requests.post('http://localhost:8000/api/v1/auth/login', data={'username': 'radio1@lungai.com', 'password': 'password123'})
token = r.json().get('access_token')
print("Login:", r.status_code)

# 2. Create Case
r2 = requests.post('http://localhost:8000/api/v1/cases/', headers={'Authorization': f'Bearer {token}'}, json={'patient_id': '6a200c66-6732-4f72-adae-44ca0871a7ff', 'visit_date': '2026-03-02'})
case_id = r2.json().get('case_id')
print("Case creation:", r2.status_code, r2.json())

# 3. Upload Image
with open('demo.jpg', 'rb') as f:
    r3 = requests.post('http://localhost:8000/api/v1/images/upload', headers={'Authorization': f'Bearer {token}'}, data={'case_id': case_id}, files={'file': ('demo.jpg', f, 'image/jpeg')})
    
print('Upload Status:', r3.status_code)
print('Upload Text:', r3.text)
