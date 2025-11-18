// 선택 가능한 최대 패턴 수
const MAX_SELECTION = 5;

// (추가) 선택 가능한 JSON 세트 정의
// file: 실제 JSON 파일명, label: 셀렉트 박스에 표시될 이름
const DATASETS = [
    { file: 'patterns_book1.json', label: 'Book 1 – 기본 패턴' },
    { file: 'patterns_book2.json', label: 'Book 2 – 감정 표현' }
    // 필요에 따라 계속 추가
    // { file: 'patterns_book3.json', label: 'Book 3 – 장소 / 시간' },
];

// 현재 선택된 데이터셋 파일명 (백엔드로 함께 보내고 싶을 때 사용)
let currentDatasetFile = null;

// 패턴 데이터(패턴 번호, 이름 등)
let patternsData = [];

// DOM 요소 참조
const patternGrid = document.getElementById('patternGrid');
const selectionInfo = document.getElementById('selectionInfo');
const generateBtn = document.getElementById('generateBtn');
const message = document.getElementById('message');
const btnDeselect = document.getElementById('btnDeselect');
const datasetSelect = document.getElementById('datasetSelect');

// 초기화: DOMContentLoaded 시
document.addEventListener('DOMContentLoaded', () => {
    // 1) 데이터셋 셀렉트 박스 옵션 채우기
    initDatasetSelect();

    // 2) 기본으로 첫 번째 세트 로딩
    if (DATASETS.length > 0) {
        const firstFile = DATASETS[0].file;
        currentDatasetFile = firstFile;
        loadPatternsFromJson(firstFile);
    }

    // 3) 버튼 이벤트
    btnDeselect.addEventListener('click', deselectAll);
    generateBtn.addEventListener('click', generateWorksheet);

    // 4) 제목(세트) 변경 시 해당 JSON 재로딩
    datasetSelect.addEventListener('change', () => {
        const file = datasetSelect.value;
        currentDatasetFile = file;
        deselectAll(); // 세트 바꾸면 선택 초기화
        loadPatternsFromJson(file);
    });
});

/**
 * (추가) 데이터셋 셀렉트 박스 옵션 초기화
 */
function initDatasetSelect() {
    // 혹시 HTML에 직접 넣어둔 옵션이 있다면 비워줌
    datasetSelect.innerHTML = '';

    DATASETS.forEach(ds => {
        const option = document.createElement('option');
        option.value = ds.file;      // 실제 JSON 파일명
        option.textContent = ds.label; // 화면에 보이는 이름
        datasetSelect.appendChild(option);
    });
}

/**
 * 정적 JSON 파일에서 패턴 데이터 로딩
 * jsonFileName: 예) 'patterns_book1.json'
 */
async function loadPatternsFromJson(jsonFileName) {
    try {
        showMessage('패턴 데이터 로딩 중...', 'success');

        const response = await fetch(jsonFileName);
        if (!response.ok) {
            throw new Error('패턴 데이터를 불러올 수 없습니다. (' + jsonFileName + ')');
        }

        const data = await response.json();
        patternsData = data;

        // 번호 기준 정렬 후 렌더링
        patternsData.sort((a, b) => a.number - b.number);
        renderPatternGrid(patternsData);

        showMessage(`${patternsData.length}개 패턴 로드 완료 (${jsonFileName})`, 'success');
    } catch (error) {
        showMessage('패턴 로딩 실패: ' + error.message, 'error');
    }
}

/**
 * 패턴 카드 그리드 렌더링
 */
function renderPatternGrid(patterns) {
    patternGrid.innerHTML = '';

    patterns.forEach(pattern => {
        const div = document.createElement('div');
        div.className = 'pattern-item';

        div.innerHTML = `
            <input
                type="checkbox"
                id="pattern_${pattern.number}"
                value="${pattern.number}"
            >
            <label class="pattern-label" for="pattern_${pattern.number}">
                ${pattern.number}. ${pattern.name}
            </label>
        `;

        const checkbox = div.querySelector('input[type="checkbox"]');

        // 카드 클릭 시 체크박스 토글 (체크박스 자체 클릭은 예외)
        div.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            if (div.classList.contains('disabled')) return;

            // 선택 제한 체크
            if (!checkbox.checked && getSelectedCount() >= MAX_SELECTION) {
                showMessage(`최대 ${MAX_SELECTION}개까지만 선택할 수 있습니다.`, 'error');
                return;
            }

            checkbox.checked = !checkbox.checked;
            handleCheckboxChange(checkbox);
        });

        // 체크박스 직접 클릭 시 처리
        checkbox.addEventListener('change', () => handleCheckboxChange(checkbox));

        patternGrid.appendChild(div);
    });

    updateSelectionCount();
}

/**
 * 체크박스 상태 변경 처리
 */
function handleCheckboxChange(checkbox) {
    if (checkbox.checked && getSelectedCount() > MAX_SELECTION) {
        checkbox.checked = false;
        showMessage(`최대 ${MAX_SELECTION}개까지만 선택할 수 있습니다.`, 'error');
        return;
    }
    updateSelectionCount();
    updateDisabledState();
}

/**
 * 현재 선택된 패턴 수 반환
 */
function getSelectedCount() {
    return document.querySelectorAll('.pattern-item input[type="checkbox"]:checked').length;
}

/**
 * 선택 수에 따라 disabled 및 selected 클래스 업데이트
 */
function updateDisabledState() {
    const selectedCount = getSelectedCount();
    const maxReached = selectedCount >= MAX_SELECTION;

    document.querySelectorAll('.pattern-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');

        if (!checkbox.checked && maxReached) {
            item.classList.add('disabled');
            checkbox.disabled = true;
        } else {
            item.classList.remove('disabled');
            checkbox.disabled = false;
        }

        item.classList.toggle('selected', checkbox.checked);
    });
}

/**
 * 전체 선택 해제
 */
function deselectAll() {
    document.querySelectorAll('.pattern-item input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
        cb.closest('.pattern-item').classList.remove('selected', 'disabled');
    });
    updateSelectionCount();
}

/**
 * 상단 선택 개수 텍스트 업데이트
 */
function updateSelectionCount() {
    const selected = getSelectedCount();
    selectionInfo.textContent = `선택된 패턴: ${selected}개 / 최대 ${MAX_SELECTION}개`;
    selectionInfo.classList.toggle('max', selected >= MAX_SELECTION);
    updateDisabledState();
}

/**
 * 워크시트 생성 요청
 * - 선택한 패턴 번호 배열을 서버의 /generate 로 POST
 * - 응답 blob을 파일로 다운로드
 * - 서버에서 PDF 또는 Word(docx)를 생성하도록 구현 필요
 */
async function generateWorksheet() {
    const selectedPatterns = Array.from(
        document.querySelectorAll('.pattern-item input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value, 10));

    if (selectedPatterns.length === 0) {
        showMessage('최소 1개 이상의 패턴을 선택해 주세요.', 'error');
        return;
    }

    try {
        generateBtn.disabled = true;
        showMessage('워크시트 생성 중...', 'success');

        const bodyData = {
            patterns: selectedPatterns
        };

        // (선택) 현재 선택된 데이터셋 파일명을 백엔드에 같이 보내고 싶다면
        if (currentDatasetFile) {
            bodyData.datasetFile = currentDatasetFile;
        }

        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            const errorText = result.error || '알 수 없는 오류가 발생했습니다.';
            showMessage('오류: ' + errorText, 'error');
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // 서버에서 PDF를 만들면 .pdf, 워드를 만들면 .docx 로 확장자만 바꿔 사용
        a.download = `Worksheet_Patterns_${selectedPatterns.join('_')}_${new Date().toISOString().split('T')[0]}.docx`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showMessage(`✅ 워크시트 생성 완료! (패턴 ${selectedPatterns.length}개)`, 'success');
    } catch (error) {
        showMessage('생성 실패: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

/**
 * 메시지 출력 유틸
 * @param {string} text - 출력할 메시지
 * @param {'success'|'error'} type - 메시지 유형
 */
function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message ' + type;
    message.style.display = 'block';

    // 성공 메시지는 3초 후 자동 숨김
    if (type === 'success') {
        setTimeout(() => {
            message.style.display = 'none';
        }, 3000);
    }
}
