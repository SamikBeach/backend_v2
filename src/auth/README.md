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
