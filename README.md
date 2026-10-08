# Orbit AI Chat

HTML, CSS, JavaScript, Node.js, Express와 OpenAI API로 만든 간단한 AI 챗봇입니다. 브라우저 탭의 `sessionStorage`에 최근 20개 메시지를 보관하고 API 요청에 함께 전송하므로, 데이터베이스 없이 이전 대화의 문맥을 반영합니다.

## 실행 방법

1. [Node.js 18 이상](https://nodejs.org/)을 설치합니다.
2. 프로젝트 폴더에서 패키지를 설치합니다.

   ```bash
   npm install
   ```

3. `.env.example`을 `.env`로 복사하고 OpenAI API 키를 입력합니다.

   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   PORT=3000
   ```

4. 서버를 실행합니다.

   ```bash
   npm run dev
   ```

5. 브라우저에서 <http://localhost:3000>을 엽니다.

## 구조

- `server.js`: Express 서버와 OpenAI API 호출
- `public/index.html`: 채팅 화면
- `public/styles.css`: 반응형 UI 스타일
- `public/app.js`: 대화 상태, 입력 처리, API 통신

API 키는 브라우저에 노출되지 않고 서버에서만 사용됩니다. `.env`는 Git에서 제외됩니다.

## 429 오류가 표시될 때

한 번의 요청에도 429 오류가 계속되면 OpenAI API의 크레딧이나 프로젝트 사용 한도를 확인하세요. ChatGPT Plus/Pro 구독과 OpenAI API 결제는 별도입니다. 결제 또는 한도 설정을 변경한 뒤 서버를 다시 시작하고 요청해 보세요.
