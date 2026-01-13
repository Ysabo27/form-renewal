/**
 * Google Sheets Loader - טוען נתונים מגוגל שיטס וממלא את הטופס
 * 
 * שימוש:
 * 1. הגדר את GOOGLE_APPS_SCRIPT_URL בקובץ HTML
 * 2. הזן תעודת זהות ולחץ על "טען מגוגל שיטס"
 */

class GoogleSheetsLoader {
    constructor(config) {
        this.appsScriptUrl = config.appsScriptUrl || '';
        this.apiKey = config.apiKey || '';
        this.spreadsheetId = config.spreadsheetId || '';
        this.sheetName = config.sheetName || 'Sheet1';
        this.idColumn = config.idColumn || 'A'; // עמודת תעודת זהות
        this.useAppsScript = config.useAppsScript !== false; // ברירת מחדל: Apps Script
    }

    /**
     * טוען נתונים מגוגל שיטס לפי תעודת זהות
     * @param {string} idNumber - מספר תעודת זהות
     * @returns {Promise<Object>} - אובייקט עם הנתונים
     */
    async loadDataById(idNumber) {
        if (!idNumber || idNumber.trim() === '') {
            throw new Error('יש להזין תעודת זהות');
        }

        try {
            let data;
            
            if (this.useAppsScript && this.appsScriptUrl) {
                data = await this.loadFromAppsScript(idNumber);
            } else if (this.apiKey && this.spreadsheetId) {
                data = await this.loadFromAPI(idNumber);
            } else {
                throw new Error('לא הוגדרו פרטי חיבור לגוגל שיטס');
            }

            return this.parseData(data);
        } catch (error) {
            console.error('שגיאה בטעינת נתונים:', error);
            throw error;
        }
    }

    /**
     * טוען נתונים דרך Google Apps Script
     */
    async loadFromAppsScript(idNumber) {
        const url = `${this.appsScriptUrl}?id=${encodeURIComponent(idNumber)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`שגיאה בטעינת נתונים: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    }

    /**
     * טוען נתונים דרך Google Sheets API
     */
    async loadFromAPI(idNumber) {
        // טוען את כל הנתונים מהגיליון
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}?key=${this.apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`שגיאה בטעינת נתונים: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('הגיליון ריק או לא נמצא');
        }

        // מחפש את השורה עם תעודת הזהות
        const headers = data.values[0];
        const idIndex = this.columnToIndex(this.idColumn);
        
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row[idIndex] && row[idIndex].toString().trim() === idNumber.toString().trim()) {
                // מצאנו את השורה - מחזירים את הנתונים
                const result = {};
                headers.forEach((header, index) => {
                    result[header] = row[index] || '';
                });
                return result;
            }
        }

        throw new Error('לא נמצאו נתונים עבור תעודת הזהות הזו');
    }

    /**
     * ממיר שם עמודה (A, B, C...) לאינדקס (0, 1, 2...)
     */
    columnToIndex(column) {
        let index = 0;
        for (let i = 0; i < column.length; i++) {
            index = index * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        return index - 1;
    }

    /**
     * מפרסר את הנתונים לפורמט אחיד
     */
    parseData(data) {
        // ממיר את הנתונים לפורמט שמתאים לשדות הטופס
        const mapping = {
            // שדות החבר
            'תעודת זהות': 'id',
            'ת.ז.': 'id',
            'id': 'id',
            'שם משפחה': 'lastName',
            'שם פרטי': 'firstName',
            'שנת לידה': 'birthYear',
            'שם האב': 'fatherName',
            'רחוב': 'street',
            'מספר בית': 'houseNumber',
            'עיר': 'city',
            'טלפון': 'phone',
            'טלפון נייד': 'phone',
            'אימייל': 'email',
            'דואר אלקטרוני': 'email',
            'email': 'email',
            
            // שדות בן/בת הזוג
            'תעודת זהות בן זוג': 'partnerId',
            'ת.ז. בן זוג': 'partnerId',
            'שם משפחה בן זוג': 'partnerLastName',
            'שם פרטי בן זוג': 'partnerFirstName',
            'שנת לידה בן זוג': 'partnerBirthYear',
            'שם האב בן זוג': 'partnerFatherName',
            'טלפון בן זוג': 'partnerPhone',
            'אימייל בן זוג': 'partnerEmail',
            
            // שדות אשראי
            'מספר אשראי': 'creditCard',
            'תוקף אשראי': 'creditExpiry',
            'שם בעל הכרטיס': 'cardHolderName',
            'תעודת זהות בעל הכרטיס': 'cardHolderId'
        };

        const parsed = {};
        
        // אם הנתונים הם אובייקט עם מפתחות
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach(key => {
                const normalizedKey = key.trim();
                const mappedKey = mapping[normalizedKey] || normalizedKey.toLowerCase();
                parsed[mappedKey] = data[key];
            });
        }

        return parsed;
    }

    /**
     * ממלא את שדות הטופס עם הנתונים
     * @param {Object} data - הנתונים לטעינה
     * @param {Object} fieldMapping - מיפוי בין מפתחות הנתונים לשדות הטופס
     */
    fillForm(data, fieldMapping) {
        // מיפוי ברירת מחדל לשדות הטופס
        const defaultMapping = {
            'id': 'input_57',
            'lastName': 'input_7',
            'firstName': 'input_8',
            'birthYear': 'input_9',
            'fatherName': 'input_13',
            'street': 'input_15',
            'houseNumber': 'input_59',
            'city': 'input_16',
            'phone': 'input_18_full',
            'email': 'input_21',
            
            'partnerId': 'input_60',
            'partnerLastName': 'input_24',
            'partnerFirstName': 'input_25',
            'partnerBirthYear': 'input_26',
            'partnerFatherName': 'input_30',
            'partnerPhone': 'input_33_full',
            'partnerEmail': 'input_36',
            
            'creditCard': 'input_40',
            'creditExpiry': 'input_61',
            'cardHolderName': 'input_42',
            'cardHolderId': 'input_62'
        };

        const mapping = { ...defaultMapping, ...fieldMapping };
        let filledCount = 0;

        Object.keys(data).forEach(key => {
            const fieldId = mapping[key];
            if (fieldId && data[key]) {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = data[key];
                    // מעדכן את JotForm אם צריך
                    if (typeof JotForm !== 'undefined' && JotForm.setValue) {
                        JotForm.setValue(fieldId, data[key]);
                    }
                    // מעדכן event listeners
                    if (field.dispatchEvent) {
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        field.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    filledCount++;
                }
            }
        });

        return filledCount;
    }

    /**
     * טוען וממלא את הטופס לפי תעודת זהות
     */
    async loadAndFill(idNumber, fieldMapping) {
        try {
            this.showLoading(true);
            const data = await this.loadDataById(idNumber);
            const filledCount = this.fillForm(data, fieldMapping);
            this.showLoading(false);
            this.showMessage(`נטענו ${filledCount} שדות בהצלחה`, 'success');
            return data;
        } catch (error) {
            this.showLoading(false);
            this.showMessage(error.message || 'אירעה שגיאה בטעינת הנתונים', 'error');
            throw error;
        }
    }

    /**
     * מציג/מסתיר אינדיקציית טעינה
     */
    showLoading(show) {
        let loader = document.getElementById('gs-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'gs-loader';
            loader.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:10000;';
            loader.innerHTML = '<div style="text-align:center;"><div style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 10px;"></div><div>טוען נתונים...</div></div>';
            document.body.appendChild(loader);
        }
        
        if (show) {
            loader.style.display = 'block';
        } else {
            loader.style.display = 'none';
        }
    }

    /**
     * מציג הודעת הודעה
     */
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:10001;background:${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};color:white;max-width:400px;`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// הוספת אנימציה CSS
if (!document.getElementById('gs-loader-styles')) {
    const style = document.createElement('style');
    style.id = 'gs-loader-styles';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        #gs-loader {
            font-family: Arial, sans-serif;
        }
    `;
    document.head.appendChild(style);
}

