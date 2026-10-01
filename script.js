document.addEventListener('DOMContentLoaded', () => {
    const treeContainer = document.getElementById('treeContainer');
    const resultContainer = document.getElementById('resultContainer');
    const searchInput = document.getElementById('searchInput');
    const toast = document.getElementById('toast');

    let allData = [];
    let treeData = {};

    // Load data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Handle possible byte order mark or encoding artifact keys from PowerShell json
            // E.g., Keys might be raw strings. Let's find the correct keys.
            if(data.length > 0) {
                const sample = data[0];
                const keys = Object.keys(sample);
                const daeCodeKey = keys.find(k => k.includes('대분류코드')) || keys[0];
                const daeNameKey = keys.find(k => k.includes('대분류명')) || keys[1];
                const jungCodeKey = keys.find(k => k.includes('중분류코드')) || keys[2];
                const jungNameKey = keys.find(k => k.includes('중분류명')) || keys[3];
                const soCodeKey = keys.find(k => k.includes('소분류코드')) || keys[4];
                const soNameKey = keys.find(k => k.includes('소분류명')) || keys[5];

                allData = data.map(item => ({
                    daeCode: item[daeCodeKey],
                    daeName: item[daeNameKey],
                    jungCode: item[jungCodeKey],
                    jungName: item[jungNameKey],
                    soCode: item[soCodeKey],
                    soName: item[soNameKey]
                }));
            }
            buildTreeData();
            renderTree();
        })
        .catch(err => {
            console.error('Data loading error:', err);
            treeContainer.innerHTML = '<div style="color:red; padding:16px;">데이터를 불러오는데 실패했습니다. data.json 파일을 확인해주세요.</div>';
        });

    function buildTreeData() {
        treeData = {};
        allData.forEach(item => {
            if (!treeData[item.daeCode]) {
                treeData[item.daeCode] = { name: item.daeName, code: item.daeCode, children: {} };
            }
            if (!treeData[item.daeCode].children[item.jungCode]) {
                treeData[item.daeCode].children[item.jungCode] = { name: item.jungName, code: item.jungCode, children: {} };
            }
            treeData[item.daeCode].children[item.jungCode].children[item.soCode] = { name: item.soName, code: item.soCode, fullItem: item };
        });
    }

    function renderTree() {
        treeContainer.innerHTML = '';
        
        Object.values(treeData).forEach(dae => {
            const daeNode = createNode(dae.name, dae.code, '대분류', true);
            const daeChildren = document.createElement('div');
            daeChildren.className = 'tree-children';
            
            Object.values(dae.children).forEach(jung => {
                const jungNode = createNode(jung.name, jung.code, '중분류', true);
                const jungChildren = document.createElement('div');
                jungChildren.className = 'tree-children';
                
                Object.values(jung.children).forEach(so => {
                    const soNode = createNode(so.name, so.code, '소분류', false);
                    soNode.addEventListener('click', () => {
                        document.querySelectorAll('.tree-node-content').forEach(el => el.classList.remove('selected'));
                        soNode.querySelector('.tree-node-content').classList.add('selected');
                        showDetail(so.fullItem);
                    });
                    jungChildren.appendChild(soNode);
                });
                
                jungNode.appendChild(jungChildren);
                setupToggle(jungNode, jungChildren);
                daeChildren.appendChild(jungNode);
            });
            
            daeNode.appendChild(daeChildren);
            setupToggle(daeNode, daeChildren);
            treeContainer.appendChild(daeNode);
        });
    }

    function createNode(name, code, type, hasChildren) {
        const div = document.createElement('div');
        div.className = 'tree-node';
        
        const toggleHtml = hasChildren ? `<i class='bx bx-chevron-right tree-toggle'></i>` : `<i class='bx bx-chevron-right tree-toggle hidden'></i>`;
        
        div.innerHTML = `
            <div class="tree-node-content">
                ${toggleHtml}
                <span class="node-code">${code}</span>
                <span class="node-name">${name}</span>
            </div>
        `;
        return div;
    }

    function setupToggle(node, childrenDiv) {
        const toggle = node.querySelector('.tree-toggle');
        const content = node.querySelector('.tree-node-content');
        
        content.addEventListener('click', (e) => {
            // If clicking the toggle icon or the row itself
            toggle.classList.toggle('open');
            childrenDiv.classList.toggle('open');
        });
    }

    function showDetail(item) {
        resultContainer.innerHTML = `
            <div class="detail-item">
                <div class="detail-header">
                    <div class="detail-title">${item.soName}</div>
                    <div class="detail-badge">소분류</div>
                </div>
                <div class="detail-body">
                    <div class="detail-row">
                        <div class="detail-label">소분류 코드</div>
                        <div class="detail-value">
                            ${item.soCode}
                            <button class="copy-btn" onclick="copyText('${item.soCode}')"><i class='bx bx-copy'></i></button>
                        </div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">상위 분류</div>
                        <div class="detail-value" style="color:var(--text-secondary); font-size:13px;">
                            ${item.daeName} > ${item.jungName}
                        </div>
                    </div>
                </div>
                <button class="action-btn" onclick="copyText('${item.soCode} ${item.soName}')">
                    <i class='bx bx-clipboard'></i> 코드 및 명칭 복사
                </button>
            </div>
        `;
    }

    window.copyText = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast();
        });
    }

    function showToast() {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        
        if (!keyword) {
            resultContainer.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-folder-open'></i>
                    <p>좌측 트리에서 업종을 선택하거나<br>위 검색창에서 업종을 검색하세요.</p>
                </div>`;
            return;
        }

        const results = allData.filter(item => 
            item.soName.toLowerCase().includes(keyword) || 
            item.soCode.toLowerCase().includes(keyword) ||
            item.jungName.toLowerCase().includes(keyword) ||
            item.daeName.toLowerCase().includes(keyword)
        );

        if (results.length === 0) {
            resultContainer.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-search-alt'></i>
                    <p>검색 결과가 없습니다.</p>
                </div>`;
            return;
        }

        resultContainer.innerHTML = results.map(item => `
            <div class="detail-item" style="cursor:pointer;" onclick="renderSpecificDetail('${item.soCode}')">
                <div class="detail-header">
                    <div class="detail-title">${highlight(item.soName, keyword)}</div>
                    <div class="detail-badge">${highlight(item.soCode, keyword)}</div>
                </div>
                <div class="detail-body">
                    <div class="detail-row">
                        <div class="detail-label">분류 경로</div>
                        <div class="detail-value" style="color:var(--text-secondary); font-size:13px;">
                            ${highlight(item.daeName, keyword)} > ${highlight(item.jungName, keyword)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    });

    window.renderSpecificDetail = function(soCode) {
        const item = allData.find(i => i.soCode === soCode);
        if (item) showDetail(item);
    }

    function highlight(text, keyword) {
        if (!text) return '';
        if (!keyword) return text;
        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.replace(regex, '<span style="background-color: #FEF08A; color: #854D0E;">$1</span>');
    }
});
