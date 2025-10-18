# ⚡ File Transfer System

A simple yet powerful **Local File Transfer System** built using **Python (Flask)** and **SQLite**.  
It enables secure sharing of files and text within your local network using unique 6-character access codes.

---

## 🚀 Features

- 📁 **Uploads Directory:**  
  All uploaded files are temporarily stored in the `uploads/` folder.

- 🗃️ **SQLite Database:**  
  The database `file_sharing.db` keeps track of all shared files and text messages.

- 🔐 **Random Access Codes:**  
  Each file or text share is assigned a **unique 6-character random code** for secure access.

- 🧹 **Automatic Cleanup:**  
  A background process runs every minute to **remove files older than 10 minutes**, ensuring efficient storage usage.

- 📝 **Supports File and Text Sharing:**  
  Share both **uploaded files** and **plain text messages** easily.

- 💻 **Localhost Only:**  
  The system is designed to run **only on localhost** for maximum security during local use.

---

## 🧰 Tech Stack

- **Backend:** Python (Flask)
- **Database:** SQLite
- **Frontend:** HTML, CSS (Flask templates)
- **Storage:** Local file system (`uploads/` folder)

---

## ⚙️ Installation & Setup

Follow these steps to run the project locally:

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/file-transfer-system.git
cd file-transfer-system

# 2. Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate   # On Windows
source venv/bin/activate  # On Mac/Linux

# 3. Install required dependencies
pip install -r requirements.txt

# 4. Run the Flask server
python app.py
