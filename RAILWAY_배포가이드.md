# 🚂 Railway 배포 가이드

## ✅ 완료된 작업
- ✅ Git 설치
- ✅ GitHub 저장소 생성: https://github.com/SerengrintF/FCdata
- ✅ 코드 업로드 완료
- ✅ `server.js` Railway 호환 설정 완료

---

## 🚀 Railway 배포 단계

### 1단계: Railway 회원가입 (3분)

1. **Railway 접속**
   - 주소: https://railway.app
   
2. **회원가입**
   - `Start a New Project` 또는 `Login` 클릭
   - **GitHub 계정으로 로그인** (권장)
   - GitHub 계정: `SerengrintF`로 로그인

3. **요금 확인**
   - 무료 플랜: 월 $5 크레딧 무료 제공
   - 소규모 프로젝트는 무료로 충분!

---

### 2단계: GitHub 저장소 연결 (3분)

1. **Railway 대시보드**
   - https://railway.app/dashboard
   
2. **New Project 클릭**
   
3. **Deploy from GitHub repo 선택**
   
4. **GitHub 연동**
   - "Configure GitHub App" 클릭
   - Railway에 GitHub 접근 권한 부여
   
5. **저장소 선택**
   - `FCdata` 저장소 선택
   - 체크박스 클릭하여 Railway 접근 권한 부여
   
6. **Deploy Now 클릭**
   - 자동으로 배포 시작!

---

### 3단계: 환경 변수 설정 (5분) ⚠️ 중요!

Railway에서 프로젝트가 생성되면:

1. **프로젝트 클릭** (방금 생성된 FCdata)

2. **Variables 탭 클릭**

3. **환경 변수 추가** (한 번에 하나씩)

#### 변수 1: NEXON_API_KEY
```
Variable Name: NEXON_API_KEY
Value: live_72e6c00482ffc1def6dde5f00b426e8d07b3d0335525104d8d9b7fe6b1a579a2efe8d04e6d233bd35cf2fabdeb93fb0d
```

#### 변수 2: ADMIN_NICKNAME
```
Variable Name: ADMIN_NICKNAME
Value: sereng88
```

#### 변수 3: ADMIN_SECRET_KEY
```
Variable Name: ADMIN_SECRET_KEY
Value: fcdata_admin_secret_key_2024_secure_random_string
```

4. **저장 확인**
   - 각 변수를 추가할 때마다 자동 저장됨
   - 3개 모두 추가되었는지 확인

---

### 4단계: 배포 확인 (2분)

1. **Deployments 탭 클릭**
   
2. **배포 상태 확인**
   - 진행 중: `Building...` → `Deploying...`
   - 성공: ✅ `Success` 표시
   - 보통 2-5분 소요

3. **로그 확인** (선택사항)
   - 배포 항목 클릭
   - `View Logs` 클릭
   - 다음 메시지가 보이면 성공:
     ```
     ✅ Server running on port 8000
     🌐 Environment: production
     🔑 Admin: sereng88
     ```

---

### 5단계: 도메인 설정 (1분)

1. **Settings 탭 클릭**

2. **Networking 섹션 찾기**
   - `Public Networking` 또는 `Domains` 섹션

3. **Generate Domain 클릭**
   - Railway가 자동으로 도메인 생성
   - 예: `fcdata-production-xxxx.up.railway.app`

4. **도메인 복사**
   - 이게 당신의 웹사이트 주소!

---

### 6단계: 웹사이트 접속 (1분)

1. **생성된 도메인 클릭**
   - 또는 브라우저 주소창에 직접 입력
   
2. **웹사이트 확인**
   - FC Online 분석 도구가 열리면 성공! 🎉

---

## 🧪 배포 후 테스트

### 체크리스트:
- ✅ 웹사이트가 열리는가?
- ✅ 닉네임 검색이 되는가?
- ✅ 대시보드가 정상 작동하는가?
- ✅ 구단별 데이터 탭이 작동하는가?
- ✅ 포메이션 분석 탭이 작동하는가?
- ✅ `sereng88` 검색 시 관리자 대시보드가 뜨는가?

---

## 🔄 코드 수정 후 재배포

**로컬에서 코드 수정 후:**

```bash
# 터미널에서 실행
git add .
git commit -m "수정 내용 설명"
git push
```

**그러면 Railway가 자동으로:**
- GitHub에서 새 코드 감지
- 자동으로 재배포
- 1-2분 후 업데이트 완료

---

## ⚠️ 주의사항

### 환경 변수 절대 공개 금지!
- ❌ GitHub에 `.env` 파일 업로드 금지 (이미 차단됨)
- ❌ API 키를 코드에 직접 작성 금지
- ✅ Railway Variables에만 저장

### 데이터 유지
- `data/` 폴더는 Railway에서 재배포 시 초기화됨
- 영구 데이터가 필요하면 데이터베이스 사용 권장

---

## 🆘 문제 해결

### 문제 1: 배포 실패 - "Build failed"
**해결:**
1. Railway → Deployments → 실패한 배포 클릭
2. `View Logs` 확인
3. 에러 메시지 확인

**일반적인 원인:**
- 환경 변수 누락 → Variables 탭에서 3개 모두 확인
- `package.json` 문제 → 이미 검증됨, 문제없음

### 문제 2: 웹사이트는 열리는데 검색이 안 됨
**해결:**
- Railway → Variables 탭
- `NEXON_API_KEY` 값 확인
- 오타 없이 정확히 입력되었는지 확인

### 문제 3: 관리자 대시보드가 안 뜸
**해결:**
- Railway → Variables 탭
- `ADMIN_NICKNAME=sereng88` 확인
- `ADMIN_SECRET_KEY` 확인

---

## 🎯 다음 단계

### Railway 배포:
1. ✅ https://railway.app 접속
2. ✅ GitHub 계정으로 로그인
3. ✅ `FCdata` 저장소 선택
4. ✅ 환경 변수 3개 추가
5. ✅ 배포 완료 확인
6. ✅ 도메인 생성
7. ✅ 웹사이트 접속!

### 완료되면:
- 🌐 전 세계 어디서든 접속 가능한 웹사이트 완성!
- 📱 모바일에서도 접속 가능!
- 🔄 코드 수정 시 자동 재배포!

---

## 📞 도움이 필요하면?

Railway 대시보드에서 에러 로그를 확인하고 알려주세요!

**현재 GitHub 저장소:**
https://github.com/SerengrintF/FCdata

**성공을 기원합니다! 🚀**

