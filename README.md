# GYMbro2 - פלטפורמת בריאות וכושר

אפליקציית רשת חברתית בתחום הבריאות והכושר המאפשרת לשתף הישגים, טיפים ותוכניות אימונים ותזונה, עם אינטגרציה של AI.

## תכונות

- **התחברות ואימות משתמשים**
  - הרשמה ולוגאין עם שם משתמש וסיסמה
  - אפשרות התחברות באמצעות Google OAuth
  - JWT ו-Refresh Tokens לניהול סשנים

- **פרופיל משתמש**
  - הצגת תמונת פרופיל ושם משתמש
  - הצגת פוסטים של המשתמש
  - עריכת פרופיל

- **שיתוף תוכן**
  - העלאת פוסטים עם טקסט ותמונה
  - עדכון ומחיקה של פוסטים
  - paging יעיל
  - אפשרות סינון פוסטים

- **תגובות ולייקים**
  - אפשרות להגיב על פוסטים
  - אפשרות לסמן לייקים ולהציג את כמות הלייקים

- **יכולות AI**
  - יצירת תוכניות אימון מותאמות אישית
  - ייעוץ תזונתי
  - חישוב ערכים תזונתיים של מזונות

## טכנולוגיות

- **צד שרת**
  - Node.js עם Express
  - TypeScript
  - MongoDB
  - JWT לאימות
  - Multer לטיפול בקבצים
  - Passport לאימות עם Google
  - Swagger לתיעוד API
  - OpenAI ו-Gemini API לשילוב יכולות AI

- **צד לקוח**
  - React
  - TypeScript
  - React Router
  - Context API לניהול מצב
  - Axios לתקשורת עם השרת
  - CSS מותאם אישית

## התקנה והרצה

### דרישות מקדימות
- Node.js
- MongoDB
- חשבון Google Developer (ל-OAuth)
- מפתח API של OpenAI או Gemini

### התקנה
1. שכפל את המאגר:
```
git clone https://github.com/your-username/gymbro2.git
cd gymbro2
```

2. התקן תלויות בשרת:
```
cd server
npm install
cp .env.example .env
```

3. עדכן את קובץ ה-.env עם המידע המתאים:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gymbro
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:3000
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

4. התקן תלויות בצד הלקוח:
```
cd ../client
npm install
cp .env.example .env
```

5. עדכן את קובץ ה-.env במידת הצורך:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### הרצה בסביבת פיתוח

1. הפעל את השרת:
```
cd server
npm run dev
```

2. הפעל את הלקוח במסוף נפרד:
```
cd client
npm start
```

3. גש לכתובת http://localhost:3000 בדפדפן שלך.

### הרצה בסביבת ייצור

1. בנה את הקוד של צד הלקוח:
```
cd client
npm run build
```

2. הפעל את השרת במצב ייצור:
```
cd ../server
npm run build
NODE_ENV=production npm start
```

## תיעוד API

תיעוד ה-API זמין בכתובת http://localhost:5000/api-docs לאחר הפעלת השרת.

## בדיקות

The project includes comprehensive tests for all API endpoints using Jest and Supertest. Tests are organized in a structured way to ensure good coverage of all functionality.

### Test Structure

Tests are organized in the `__tests__` directory with the following structure:

```
__tests__/
  ├── auth/
  │   ├── login.test.ts
  │   ├── register.test.ts
  │   └── refresh-token.test.ts
  ├── posts/
  │   ├── create-post.test.ts
  │   ├── update-post.test.ts
  │   ├── delete-post.test.ts
  │   └── get-posts.test.ts
  ├── comments/
  │   └── comments.test.ts
  ├── likes/
  │   └── likes.test.ts
  ├── ai/
  │   └── ai-services.test.ts
  ├── __mocks__/
  │   └── test-image.jpg
  └── setup.ts
```

### Running Tests

To run all tests:

```bash
npm test
```

To run specific test files:

```bash
npm test -- __tests__/auth/login.test.ts
```

To run with coverage report:

```bash
npm test -- --coverage
```

### Test Coverage

The tests cover the following functionality:

- **Authentication**: User registration, login, refresh tokens and Google OAuth
- **Posts**: Creating, updating, deleting and fetching posts
- **Comments**: Adding, fetching and deleting comments
- **Likes**: Adding, removing and fetching likes
- **AI Services**: Testing AI-powered workout plans, nutrition advice and nutritional calculations

Each test set includes both positive tests (happy path) and negative tests (validation errors, unauthorized access, etc.) to ensure robust coverage of all functionality.

## קרדיטים

- פותח על ידי:
  - [השם שלך](https://github.com/your-username)
  - [השם של החבר שלך](https://github.com/friend-username)

## רישיון

פרויקט זה מופץ תחת רישיון MIT. ראה קובץ [LICENSE](LICENSE) למידע נוסף.

## הוספת התחברות באמצעות Google OAuth

האפליקציה תומכת כעת בהתחברות והרשמה באמצעות חשבון Google (Google OAuth). להלן השלבים להגדרת התכונה:

### 1. הקמת פרויקט ב-Google Cloud Platform

1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש או השתמש בפרויקט קיים
3. בתפריט הצד, בחר "APIs & Services" > "Credentials"
4. לחץ על "Create Credentials" > "OAuth client ID"
5. בחר "Web application" כסוג האפליקציה
6. הוסף שם לאפליקציה (למשל "GYMbro Auth")
7. תחת "Authorized JavaScript origins", הוסף את ה-URL של הקליינט שלך:
   - לפיתוח מקומי: `http://localhost:3000`
   - לייצור: `https://your-production-domain.com`
8. לחץ על "Create" כדי ליצור את פרטי האימות

### 2. הגדרת תצורת האפליקציה

1. העתק את ה-Client ID שנוצר בשלב הקודם
2. בתיקיית הקליינט, עדכן את קובץ `.env.local` והוסף את המזהה:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your-client-id-here
   ```
3. הפעל מחדש את שרת הפיתוח (אם הוא פועל)

### 3. שימוש בתכונה

כעת, בדפי ההתחברות וההרשמה של האפליקציה יופיע כפתור "התחבר עם Google" שמאפשר למשתמשים להתחבר או להירשם באמצעות חשבון Google שלהם.

כאשר משתמש מתחבר דרך Google:
- אם זו הפעם הראשונה, נוצר עבורו חשבון חדש באופן אוטומטי
- אם כבר קיים חשבון עם אותה כתובת אימייל, החשבון הקיים מקושר לחשבון Google

### 4. אבטחה והערות חשובות

- לעולם אל תחשוף את מזהה הלקוח בקוד ציבורי או תשתף אותו
- בסביבת ייצור, הוסף היגיון נוסף לוודא תקפות הטוקן מ-Google
- שקול להוסיף אימות נוסף לתהליך הרישום/התחברות
- תמיד בדוק את אישורי הלקוח בצד השרת לפני יצירת משתמש חדש או התחברות 