# 모바일 OAuth 테스트 가이드

## 수정된 백엔드 기능 확인

### 1. AuthController 변경사항

- ✅ 클라이언트 타입 감지 메서드 추가
- ✅ Google OAuth 시작/콜백에 `client_type` 파라미터 처리 추가
- ✅ Naver OAuth 시작/콜백에 `client_type` 파라미터 처리 추가
- ✅ Kakao OAuth 시작/콜백에 `client_type` 파라미터 처리 추가
- ✅ Apple OAuth 시작/콜백에 `client_type` 파라미터 처리 추가
- ✅ 모바일 클라이언트용 Deep Link 리다이렉트 구현
- ✅ 에러 처리시에도 클라이언트 타입에 따른 분기 처리

### 2. 테스트 URL

#### 웹 브라우저에서 테스트 (기존 방식)

```
GET http://localhost:3005/api/v2/auth/google
GET http://localhost:3005/api/v2/auth/naver
GET http://localhost:3005/api/v2/auth/kakao
GET http://localhost:3005/api/v2/auth/apple
```

#### 모바일 클라이언트 시뮬레이션

```
GET http://localhost:3005/api/v2/auth/google?client_type=mobile
GET http://localhost:3005/api/v2/auth/naver?client_type=mobile
GET http://localhost:3005/api/v2/auth/kakao?client_type=mobile
GET http://localhost:3005/api/v2/auth/apple?client_type=mobile
```

### 3. 예상 리다이렉트 결과

#### 웹 클라이언트 (기존)

```
http://localhost:3000/auth/social-callback?token=<access_token>&refreshToken=<refresh_token>
```

#### 모바일 클라이언트 (새로 구현됨)

```
miyuk-books://auth/callback?token=<access_token>&refreshToken=<refresh_token>&user=<encoded_user_info>
```

### 4. 에러 케이스 테스트

#### 웹 클라이언트 에러

```
http://localhost:3000/auth/social-callback?error=<error_message>
```

#### 모바일 클라이언트 에러

```
miyuk-books://auth/callback?error=<error_message>
```

## 환경 변수 추가 필요

`.env` 파일에 다음을 추가해야 합니다:

```bash
# 모바일 Deep Link
MOBILE_DEEP_LINK_SCHEME=miyuk-books
MOBILE_AUTH_CALLBACK=miyuk-books://auth/callback
```

## 모바일 앱 구현 요구사항

### 1. Deep Link 스키마 등록

- iOS: URL Types에 `miyuk-books` 스키마 등록
- Android: Intent Filter에 `miyuk-books` 스키마 등록

### 2. React Native 구현 예시

```javascript
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// OAuth 시작
const startOAuth = async (provider) => {
  const authUrl = `${API_BASE_URL}/auth/${provider}?client_type=mobile`;
  await WebBrowser.openBrowserAsync(authUrl);
};

// Deep Link 처리
const useDeepLink = () => {
  useEffect(() => {
    const handleDeepLink = (url) => {
      if (url.startsWith('miyuk-books://auth/callback')) {
        const parsedUrl = new URL(url);

        // 에러 처리
        const error = parsedUrl.searchParams.get('error');
        if (error) {
          console.error('OAuth Error:', decodeURIComponent(error));
          return;
        }

        // 성공 처리
        const token = parsedUrl.searchParams.get('token');
        const refreshToken = parsedUrl.searchParams.get('refreshToken');
        const userParam = parsedUrl.searchParams.get('user');

        if (token && refreshToken) {
          // 토큰 저장
          setTokens(token, refreshToken);

          // 사용자 정보 설정
          if (userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            setUser(user);
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription?.remove();
  }, []);
};
```

## 백엔드 로그 확인

서버 실행 시 다음과 같은 로그를 확인할 수 있습니다:

```
[AuthController] Google callback - Client Type: mobile
[AuthController] Redirecting to Deep Link: miyuk-books://auth/callback?token=...
```

## 테스트 순서

1. ✅ **환경 변수 설정**: 모바일 Deep Link 관련 환경 변수 추가
2. ✅ **백엔드 코드 변경**: AuthController 수정 완료
3. 🔄 **서버 재시작**: 변경사항 적용
4. 🔄 **웹 브라우저 테스트**: 기존 OAuth 동작 확인
5. 🔄 **모바일 파라미터 테스트**: `client_type=mobile` 추가하여 Deep Link 리다이렉트 확인
6. 🔄 **모바일 앱 구현**: Deep Link 처리 로직 구현
7. 🔄 **전체 플로우 테스트**: 모바일 앱에서 OAuth 시작부터 토큰 수신까지

## 주의사항

- Deep Link가 정상 동작하려면 해당 스키마를 처리할 수 있는 앱이 설치되어 있어야 합니다
- 테스트 시 시뮬레이터보다는 실제 디바이스에서 테스트하는 것을 권장합니다
- Apple OAuth의 경우 실제 Apple Developer 계정과 설정이 필요합니다
