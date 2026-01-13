/**
 * Google Apps Script - טוען נתונים מגוגל שיטס לפי תעודת זהות
 * 
 * הוראות שימוש:
 * 1. פתח את Google Sheets שלך
 * 2. לחץ על Extensions > Apps Script
 * 3. הדבק את הקוד הזה
 * 4. שנה את SPREADSHEET_ID ו-SHEET_NAME בהתאם
 * 5. לחץ על Deploy > New deployment
 * 6. בחר Type: Web app
 * 7. הגדר Execute as: Me, Who has access: Anyone
 * 8. לחץ Deploy והעתק את ה-URL
 * 9. השתמש ב-URL הזה בקובץ HTML
 */

// הגדר כאן את ID של הגיליון (מהכתובת: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
const SPREADSHEET_ID = '1ktlMfAWApeCWcQKQv6ALj0GOAn5AHptHeRS2wONcn9c';

// שם הגיליון (ברירת מחדל: Sheet1)
const SHEET_NAME = 'ראשי';
// עמודת תעודת זהות (A = עמודה ראשונה = "מס זהות")
// אם "מס זהות" לא בעמודה הראשונה, שנה את הערך כאן
const ID_COLUMN = 'A';

/**
 * פונקציה ראשית - נקראת כאשר מבקשים נתונים
 */
function doGet(e) {
  try {
    const idNumber = e.parameter.id;
    
    if (!idNumber) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'לא הוזן מספר תעודת זהות'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // טוען את הנתונים מהגיליון
    const data = loadDataFromSheet(idNumber);
    
    if (!data) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'לא נמצאו נתונים עבור תעודת הזהות הזו'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'שגיאה: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * טוען נתונים מהגיליון לפי תעודת זהות
 */
function loadDataFromSheet(idNumber) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('הגיליון לא נמצא');
    }

    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return null; // אין נתונים (רק כותרות או ריק)
    }

    // שורה ראשונה = כותרות
    const headers = data[0];
    
    // מצא את אינדקס עמודת תעודת הזהות
    const idColumnIndex = columnToIndex(ID_COLUMN);
    
    // חפש את השורה עם תעודת הזהות
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowId = row[idColumnIndex] ? row[idColumnIndex].toString().trim() : '';
      
      if (rowId === idNumber.toString().trim()) {
        // מצאנו את השורה - בונה אובייקט עם הנתונים
        const result = {};
        headers.forEach((header, index) => {
          if (header && header.toString().trim() !== '') {
            result[header.toString().trim()] = row[index] ? row[index].toString() : '';
          }
        });
        return result;
      }
    }
    
    return null; // לא נמצא
    
  } catch (error) {
    Logger.log('שגיאה בטעינת נתונים: ' + error.toString());
    throw error;
  }
}

/**
 * ממיר שם עמודה (A, B, C...) לאינדקס (0, 1, 2...)
 */
function columnToIndex(column) {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return index - 1;
}

/**
 * פונקציה לבדיקה מקומית (לא בשימוש ב-Web App)
 */
function testLoadData() {
  const testId = '123456789'; // החלף במספר תעודת זהות לבדיקה
  const result = loadDataFromSheet(testId);
  Logger.log(JSON.stringify(result, null, 2));
}

