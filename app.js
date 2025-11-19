// 선택 가능한 최대 패턴 수
const MAX_SELECTION = 5;

// 선택 가능한 JSON 세트 정의 (파일명은 실제 파일에 맞게 수정)
const DATASETS = [
    { file: 'patterns_book1.json', label: 'Book 1 – 기본 패턴' },
    { file: 'patterns_book2.json', label: 'Book 2 – 감정 표현' }
    // { file: 'patterns_book3.json', label: 'Book 3 – 장소 / 시간' },
];

// 현재 선택된 데이터셋 파일명
let currentDatasetFile = null;

// 패턴 데이터
let patternsData = [];

// DOM 요소 참조
const patternGrid = document.getElementById('patternGrid');
const selectionInfo = document.getElementById('selectionInfo');
const generateBtn = document.getElementById('generateBtn');
const message = document.getElementById('message');
const btnDeselect = document.getElementById('btnDeselect');
const datasetSelect = document.getElementById('datasetSelect');

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initDatasetSelect();

    if (DATASETS.length > 0) {
        const firstFile = DATASETS[0].file;
        currentDatasetFile = firstFile;
        loadPatternsFromJson(firstFile);
    }

    btnDeselect.addEventListener('click', deselectAll);
    generateBtn.addEventListener('click', generateWorksheet);

    datasetSelect.addEventListener('change', () => {
        const file = datasetSelect.value;
        currentDatasetFile = file;
        deselectAll();
        loadPatternsFromJson(file);
    });
});

/**
 * 데이터셋 셀렉트 박스 옵션 초기화
 */
function initDatasetSelect() {
    datasetSelect.innerHTML = '';

    DATASETS.forEach(ds => {
        const option = document.createElement('option');
        option.value = ds.file;
        option.textContent = ds.label;
        datasetSelect.appendChild(option);
    });
}

/**
 * JSON에서 패턴 데이터 로딩
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

        div.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            if (div.classList.contains('disabled')) return;

            if (!checkbox.checked && getSelectedCount() >= MAX_SELECTION) {
                showMessage(`최대 ${MAX_SELECTION}개까지만 선택할 수 있습니다.`, 'error');
                return;
            }

            checkbox.checked = !checkbox.checked;
            handleCheckboxChange(checkbox);
        });

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
 * 현재 선택된 패턴 수
 */
function getSelectedCount() {
    return document.querySelectorAll('.pattern-item input[type="checkbox"]:checked').length;
}

/**
 * disabled / selected 상태 업데이트
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
 * 선택 카운트 텍스트 업데이트
 */
function updateSelectionCount() {
    const selected = getSelectedCount();
    selectionInfo.textContent = `선택된 패턴: ${selected}개 / 최대 ${MAX_SELECTION}개`;
    selectionInfo.classList.toggle('max', selected >= MAX_SELECTION);
    updateDisabledState();
}

/**
 * 워크시트 생성 (예전 PDF 레이아웃 그대로 docx로 재현)
 * - 선택한 각 패턴마다 1페이지씩 생성 (Weekly Test 양식)
 */
/**
 * 워크시트 생성 (선택한 패턴들을 1장짜리 시트로 조합)
 * - Speaking I: 고정 5문항
 * - Speaking II: 선택한 패턴들의 Speaking II 문장을 앞에서부터 5개까지 채움
 * - Unscramble: 선택한 패턴들의 Unscramble 문항을 앞에서부터 5개까지 채움
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
        showMessage('워크시트(docx) 생성 중...', 'success');

        // 패턴 번호 정렬
        const selectedSorted = [...selectedPatterns].sort((a, b) => a - b);

        // docx 객체
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

        // Speaking II / Unscramble 문항 풀 만들기
        const speaking2Pool = [];
        const unscramblePool = [];

        selectedSorted.forEach(num => {
            const pattern = patternsData.find(p => p.number === num);
            if (!pattern || !pattern.sections) return;

            const s2 = pattern.sections['Speaking II'] || [];
            s2.forEach(item => {
                speaking2Pool.push({
                    patternNumber: num,
                    text: item.koreanOrQuestion || ''
                });
            });

            const uns = pattern.sections['Unscramble'] || [];
            uns.forEach(item => {
                unscramblePool.push({
                    patternNumber: num,
                    koreanOrQuestion: item.koreanOrQuestion || '',
                    scrambled: item.scrambled || ''
                });
            });
        });

        const children = [];

        // 1) 상단 헤더: Weekly Test
        children.push(
            new Paragraph({
                text: 'Weekly Test',
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            })
        );

        // Pattern Level A - Patterns: 2, 5, 7 ...
        const patternLabel = selectedSorted.join(', ');
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Pattern Level A - Patterns: ${patternLabel}`,
                        bold: true
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            })
        );

        // NAME / DATE
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'NAME: _______________________________',
                        size: 24
                    })
                ],
                spacing: { after: 100 }
            })
        );

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'DATE: _____ / _____',
                        size: 24
                    })
                ],
                spacing: { after: 200 }
            })
        );

        // 2) Speaking I - 고정 문항
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '■ Speaking I - Answer the questions',
                        bold: true
                    })
                ],
                spacing: { after: 100 }
            })
        );

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'PATTERN',
                        bold: true
                    })
                ],
                spacing: { after: 100 }
            })
        );

        const speakingIPrompts = [
            '1. Practice pattern',
            '2. Make sentence',
            '3. Use pattern',
            '4. Try',
            '5. Can you answer?'
        ];

        speakingIPrompts.forEach(line => {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: line, size: 24 })],
                    spacing: { after: 80 }
                })
            );
        });

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

        // 3) Speaking II - 선택한 패턴들의 문장 조합 (최대 5문항)
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '■ Speaking II - Say in English',
                        bold: true
                    })
                ],
                spacing: { after: 100 }
            })
        );

        for (let i = 0; i < 5; i++) {
            const item = speaking2Pool[i];
            let lineText;
            if (item) {
                // 패턴 번호 표시를 하고 싶으면 [P14] 등 붙이기
                lineText = `${i + 1}. ${item.text}`;
            } else {
                // 문항이 부족할 때는 빈 줄로 처리
                lineText = `${i + 1}. __________________________`;
            }

            children.push(
                new Paragraph({
                    children: [new TextRun({ text: lineText, size: 24 })],
                    spacing: { after: 80 }
                })
            );
        }

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

        // 4) Unscramble - 선택한 패턴들의 문항 조합 (최대 5문항)
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '■ Unscramble',
                        bold: true
                    })
                ],
                spacing: { after: 100 }
            })
        );

        for (let i = 0; i < 5; i++) {
            const q = unscramblePool[i];
            if (!q) {
                // 부족하면 더 이상 안 채움
                break;
            }

            const scrambledText = q.scrambled ? ` (${q.scrambled})` : '';

            // 문장 줄
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${i + 1}. ${q.koreanOrQuestion}${scrambledText}`,
                            size: 24
                        })
                    ],
                    spacing: {
                        after: 120
                    }
                })
            );

            // 밑줄 줄 (쓰기 공간) – 넉넉하게
            children.push(
                new Paragraph({
                    border: {
                        bottom: {
                            color: '000000',
                            space: 1,
                            value: 'single',
                            size: 8
                        }
                    },
                    spacing: {
                        after: 260
                    }
                })
            );
        }

        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

        // 5) GRADE / REMARK
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'GRADE:',
                        bold: true,
                        size: 24
                    })
                ],
                spacing: { after: 120 }
            })
        );

        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'REMARK:',
                        bold: true,
                        size: 24
                    })
                ],
                spacing: { after: 200 }
            })
        );

        // 👉 전체를 1개 섹션(=1장의 시트)로만 구성
        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children
                }
            ]
        });

        const blob = await Packer.toBlob(doc);

        const fileBase =
            (currentDatasetFile ? currentDatasetFile.replace('.json', '') : 'worksheet') +
            `_patterns_${selectedSorted.join('_')}`;
        const fileName = `${fileBase}.docx`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showMessage(`✅ 워크시트 생성 완료! (${fileName})`, 'success');
    } catch (error) {
        console.error(error);
        showMessage('생성 실패: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

/**
 * 메시지 출력 유틸
 */
function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message ' + type;
    message.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            message.style.display = 'none';
        }, 3000);
    }
}
