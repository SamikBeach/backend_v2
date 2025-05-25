# 소셜 로그인 설정 가이드

## 환경 변수 설정

`.env.development` 또는 `.env.production` 파일에 다음 환경 변수를 추가해야 합니다:

```
# 네이버 OAuth (passport-naver-v2 사용)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
NAVER_CALLBACK_URL=http://localhost:3000/api/auth/naver/callback

# 카카오 OAuth
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_CALLBACK_URL=http://localhost:3000/api/auth/kakao/callback

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key
```

## 네이버 개발자 센터 설정

1. [네이버 개발자 센터](https://developers.naver.com/apps/#/register?api=nvlogin)에 접속하여 애플리케이션을 등록합니다.
2. 애플리케이션 이름과 설명을 입력합니다.
3. 사용 API를 "네이버 로그인"으로 선택합니다.
4. 서비스 URL을 입력합니다 (예: http://localhost:3000).
5. 네이버 로그인 설정에서 다음 정보를 입력합니다:
   - 로그인 오픈 API 서비스 환경: PC 웹
   - 서비스 URL: 애플리케이션 서비스 URL과 동일
   - 콜백 URL: `http://localhost:3000/api/auth/naver/callback`
6. 제공정보 선택에서 필요한 정보를 선택합니다 (이메일, 닉네임, 프로필 이미지 등)
7. 애플리케이션을 등록한 후 발급받은 Client ID와 Client Secret을 환경 변수에 설정합니다.

### 네이버 로그인 특이사항

- 네이버는 필수정보 항목에 체크를 하지 않아도 로그인이 됩니다.
- 사용자가 정보 제공에 동의하지 않으면 해당 정보는 null로 전달됩니다.
- 이미 동의한 사용자에게 다시 동의창을 보여주려면 `authType: 'reprompt'` 옵션을 사용할 수 있습니다.

## passport-naver-v2 사용

이 프로젝트는 `passport-naver-v2`를 사용합니다. 이는 기존 `passport-naver`보다 다음과 같은 장점이 있습니다:

- 더 많은 프로필 정보 제공 (나이, 성별, 전화번호, 생년월일 등)
- 최신 TypeScript 지원
- 활발한 유지보수

### 제공되는 프로필 정보

| 필드         | 타입   | 선택적 | 설명                              |
| ------------ | ------ | ------ | --------------------------------- |
| provider     | String | X      | 'naver' 고정값                    |
| id           | String | X      | 사용자의 네이버 ID                |
| nickname     | String | O      | 사용자의 닉네임                   |
| profileImage | String | O      | 사용자의 프로필 이미지            |
| age          | String | O      | 사용자의 나이 (예: '28-29')       |
| gender       | String | O      | 사용자의 성별 ('F' 또는 'M')      |
| email        | String | O      | 사용자의 이메일                   |
| mobile       | String | O      | 사용자의 전화번호                 |
| mobileE164   | String | O      | 사용자의 전화번호 (국가번호 포함) |
| name         | String | O      | 사용자의 이름                     |
| birthday     | String | O      | 사용자의 생년월일                 |
| birthYear    | String | O      | 사용자의 생년                     |

## 카카오 개발자 센터 설정

1. [카카오 개발자 센터](https://developers.kakao.com/console/app)에 접속하여 애플리케이션을 등록합니다.
2. 앱 이름과 회사명을 입력합니다.
3. 앱 설정 > 플랫폼 > Web 플랫폼 등록에서 사이트 도메인을 추가합니다 (예: http://localhost:3000).
4. 제품 설정 > 카카오 로그인에서 활성화 설정을 합니다.
5. 카카오 로그인 > Redirect URI에 `http://localhost:3000/api/auth/kakao/callback`을 추가합니다.
6. 제품 설정 > 카카오 로그인 > 동의항목에서 필요한 정보 동의항목을 설정합니다 (이메일 등).
7. 앱 키 > REST API 키를 Client ID로, 보안 > Client Secret을 발급받아 환경 변수에 설정합니다.

## 클라이언트 측 구현

클라이언트에서는 다음과 같은 링크를 통해 소셜 로그인을 시작할 수 있습니다:

```html
<a href="/api/auth/naver">네이버로 로그인</a>
<a href="/api/auth/kakao">카카오로 로그인</a>
```

로그인 성공 시 `/auth/social-callback` 경로로 리다이렉트되며, 쿼리 파라미터로 액세스 토큰과 리프레시 토큰이 전달됩니다.

## YouTube API 설정

### Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 새 프로젝트를 생성하거나 기존 프로젝트를 선택합니다.
3. API 및 서비스 > 라이브러리로 이동합니다.
4. "YouTube Data API v3"를 검색하여 활성화합니다.
5. API 및 서비스 > 사용자 인증 정보로 이동합니다.
6. "사용자 인증 정보 만들기" > "API 키"를 선택합니다.
7. 생성된 API 키를 복사하여 환경 변수 `YOUTUBE_API_KEY`에 설정합니다.

### API 키 제한 설정 (권장)

보안을 위해 API 키에 제한을 설정하는 것이 좋습니다:

1. 생성된 API 키를 클릭하여 편집 페이지로 이동합니다.
2. "API 제한사항"에서 "키 제한"을 선택합니다.
3. "YouTube Data API v3"만 선택합니다.
4. 필요에 따라 IP 주소나 HTTP 리퍼러 제한을 설정합니다.

### 사용 가능한 엔드포인트

YouTube API가 설정되면 다음 엔드포인트를 사용할 수 있습니다:

- `GET /api/book/:id/videos` - 책 ID로 관련 YouTube 영상 조회
- `GET /api/book/isbn/:isbn/videos` - ISBN으로 관련 YouTube 영상 조회

### 할당량 관리

YouTube Data API v3는 일일 할당량이 있습니다 (기본 10,000 단위/일). 할당량 초과 시 API 호출이 실패할 수 있으므로 캐시를 활용하여 API 호출을 최소화합니다.
