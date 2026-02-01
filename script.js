import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvwQgyakS9eh9R0TYRODmc5EXJAoCbtAc",
    authDomain: "readytravel-f4e1c.firebaseapp.com",
    databaseURL: "https://readytravel-f4e1c-default-rtdb.firebaseio.com",
    projectId: "readytravel-f4e1c",
    storageBucket: "readytravel-f4e1c.firebasestorage.app",
    messagingSenderId: "772163379284",
    appId: "1:772163379284:web:ad9285538cf9d61c8f8dc1",
    measurementId: "G-7WBH433JKG"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 로컬 스토리지에서 마지막으로 선택한 사용자 가져오기 (없으면 강민성 기본)
let currentUser = localStorage.getItem('readyTravelUser') || '강민성';
let currentTravel = '첫여행';
let categories = [];
let travels = [];
let selectedVersionToLoad = '';
let currentUnsubscribe = null;
let isLocked = true;
let foldedCategories = new Set();
let currentDataSnapshot = null;

const statusToggle = { 'X': 'O', 'O': 'X' };

onValue(ref(database, 'travelNames'), (snapshot) => {
    const data = snapshot.val();
    const select = document.getElementById('travelSelect');
    if (data) travels = Object.keys(data);
    else { travels = ['첫여행']; set(ref(database, 'travelNames/첫여행'), true); }

    const currentVal = select.value || currentTravel;
    select.innerHTML = travels.map(t => `<option value="${t}">${t}</option>`).join('');
    if (travels.includes(currentVal)) select.value = currentVal;
    else select.value = travels[0];
    currentTravel = select.value;
    
    // 초기 로드 시 탭 활성화 상태 동기화
    updateUserTabUI();
});

window.toggleLock = () => {
    isLocked = !isLocked;
    const lockBtn = document.getElementById('lockBtn');
    if (isLocked) {
        lockBtn.innerText = '순서잠금 🔒';
        lockBtn.classList.remove('unlocked');
        document.body.classList.remove('is-unlocked');
    } else {
        lockBtn.innerText = '순서이동 🔓';
        lockBtn.classList.add('unlocked');
        document.body.classList.add('is-unlocked');
    }
};

window.toggleFold = (event, catId) => {
    if (event) {
        event.stopPropagation();
        if (event.type === 'touchstart') event.preventDefault();
    }
    if (foldedCategories.has(catId)) foldedCategories.delete(catId);
    else foldedCategories.add(catId);
    
    const items = document.querySelectorAll(`tr[data-category="${catId}"][data-type="item"]`);
    const btn = document.querySelector(`tr[data-id="${catId}"][data-type="category"] .fold-btn`);
    items.forEach(item => item.classList.toggle('hidden-item'));
    if (btn) btn.innerText = foldedCategories.has(catId) ? '▶' : '▼';
};

// 사용자 UI 탭 업데이트 전용 함수
function updateUserTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `tab-${currentUser}`) btn.classList.add('active');
    });
}

window.switchUser = (user) => {
    currentUser = user;
    // 로컬 스토리지에 현재 사용자 저장 (새로고침해도 유지되게 함)
    localStorage.setItem('readyTravelUser', user);
    updateUserTabUI();
    loadData();
};

window.addNewTravel = () => {
    const name = prompt("새로운 여행 틀 이름을 입력하세요:");
    if (name) set(ref(database, `travelNames/${name}`), true);
};

window.saveCurrentList = () => {
    const versionName = prompt("저장할 버전 이름을 입력하세요:");
    if (!versionName) return;
    get(ref(database, `travels/${currentTravel}/${currentUser}/current`)).then((snap) => {
        if (snap.exists()) {
            set(ref(database, `travels/${currentTravel}/${currentUser}/savedLists/${versionName}`), snap.val())
                .then(() => alert(`'${versionName}' 저장 완료!`));
        } else alert("저장할 내용이 없습니다.");
    });
};

window.resetCurrentList = () => {
    if (confirm("현재 실시간 체크리스트를 모두 비우시겠습니까?")) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}/current`));
    }
};

window.openCategoryModal = () => {
    const list = document.getElementById('currentCategoryList');
    list.innerHTML = categories.map(c => `<span class="cat-tag">${c}</span>`).join('');
    document.getElementById('categoryModal').style.display = 'flex';
};

window.saveCategory = () => {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/current/${name}/_isCategory`), { index: categories.length })
        .then(() => {
            document.getElementById('newCategoryName').value = '';
            closeModal('categoryModal');
        });
};

window.addItem = () => {
    refreshSelectMenus();
    document.getElementById('itemModal').style.display = 'flex';
};

window.saveItem = () => {
    const cat = document.getElementById('categorySelect').value;
    const name = document.getElementById('newItemName').value.trim();
    if (!name) return;

    const allItems = getAllExistingItems();
    let finalName = name;
    if (allItems.includes(name)) {
        if (!confirm(`'${name}'은(는) 이미 존재합니다. 숫자(2)를 붙여 추가할까요?`)) return;
        finalName = getNumberedName(name, allItems);
    }

    get(ref(database, `travels/${currentTravel}/${currentUser}/current/${cat}`)).then(snap => {
        const idx = snap.exists() ? Object.keys(snap.val()).length : 0;
        set(ref(database, `travels/${currentTravel}/${currentUser}/current/${cat}/${finalName}`), { out: 'X', in: 'X', index: idx })
            .then(() => {
                document.getElementById('newItemName').value = '';
                closeModal('itemModal');
            });
    });
};

window.openLoadModal = () => {
    onValue(ref(database, `travels/${currentTravel}/${currentUser}/savedLists`), (snap) => {
        const display = document.getElementById('savedVersionsDisplay');
        if (snap.exists()) {
            display.innerHTML = Object.keys(snap.val()).map(v => 
                `<li id="ver-${v}" onclick="setVersionToLoad('${v}')">
                    <span>📄 ${v}</span>
                    <button class="mini-del-btn" onclick="deleteVersion(event, '${v}')">X</button>
                </li>`).join('');
        } else display.innerHTML = '<li>저장된 버전 없음</li>';
    });
    refreshSelectMenus();
    document.getElementById('loadModal').style.display = 'flex';
};

window.setVersionToLoad = (name) => {
    selectedVersionToLoad = name;
    document.querySelectorAll('#savedVersionsDisplay li').forEach(li => li.classList.toggle('selected', li.id === `ver-${name}`));
};

window.deleteVersion = (event, name) => {
    event.stopPropagation();
    if (confirm(`'${name}' 버전을 삭제하시겠습니까?`)) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}/savedLists/${name}`));
    }
};

window.confirmLoadVersion = () => {
    if (!selectedVersionToLoad) return alert("불러올 버전을 선택하세요.");
    get(ref(database, `travels/${currentTravel}/${currentUser}/savedLists/${selectedVersionToLoad}`)).then(snap => {
        set(ref(database, `travels/${currentTravel}/${currentUser}/current`), snap.val());
        closeModal('loadModal');
    });
};

function getAllExistingItems() {
    if (!currentDataSnapshot) return [];
    let items = [];
    Object.keys(currentDataSnapshot).forEach(cat => {
        const catData = currentDataSnapshot[cat];
        Object.keys(catData).forEach(key => {
            if (key !== '_isCategory') items.push(key);
        });
    });
    return items;
}

function getNumberedName(name, existingList) {
    let baseName = name.replace(/\(\d+\)$/, "").trim();
    let counter = 2;
    let newName = `${baseName}(${counter})`;
    while (existingList.includes(newName)) {
        counter++;
        newName = `${baseName}(${counter})`;
    }
    return newName;
}

function handleDuplicates(newItems, existingItems, callback) {
    const duplicates = newItems.filter(item => existingItems.includes(item));
    if (duplicates.length > 0) {
        document.getElementById('dupMsg').innerHTML = `전체 목록 중 <b>${duplicates.length}개</b>의 중복 항목이 발견되었습니다.<br>(중복: ${duplicates.join(', ')})<br><br><b>중복 제외</b>: 이미 있는 것은 빼고 새로 입력한 것만 추가합니다.<br><b>숫자 붙여 추가</b>: 이름 뒤에 (2) 등을 붙여 강제로 추가합니다.`;
        document.getElementById('duplicateModal').style.display = 'flex';
        
        document.getElementById('btnRemoveDup').onclick = () => {
            const filtered = newItems.filter(item => !existingItems.includes(item));
            callback(filtered, false);
            closeModal('duplicateModal');
        };
        document.getElementById('btnKeepDup').onclick = () => {
            callback(newItems, true);
            closeModal('duplicateModal');
        };
    } else {
        callback(newItems, false);
    }
}

window.uploadBulkCategories = () => {
    const text = document.getElementById('bulkCategoryText').value;
    if (!text.trim()) return;
    const cats = text.split('\n').map(c => c.trim()).filter(c => c !== "");
    
    handleDuplicates(cats, categories, (targetCats, shouldNumber) => {
        const updates = {};
        let allCats = [...categories];
        targetCats.forEach((c, idx) => {
            let finalName = (shouldNumber && categories.includes(c)) ? getNumberedName(c, allCats) : c;
            if (shouldNumber) allCats.push(finalName);
            updates[`travels/${currentTravel}/${currentUser}/current/${finalName}/_isCategory`] = { index: categories.length + idx };
        });
        update(ref(database), updates).then(() => {
            document.getElementById('bulkCategoryText').value = '';
            alert("카테고리 처리 완료!");
        });
    });
};

window.uploadBulkItems = () => {
    const cat = document.getElementById('bulkItemCategorySelect').value;
    const text = document.getElementById('bulkItemText').value;
    if (!text.trim()) return;
    const items = text.split('\n').map(i => i.trim()).filter(i => i !== "");

    const allExistingItems = getAllExistingItems();

    handleDuplicates(items, allExistingItems, (targetItems, shouldNumber) => {
        const updates = {};
        let currentAll = [...allExistingItems];
        const catItemCount = currentDataSnapshot && currentDataSnapshot[cat] 
            ? Object.keys(currentDataSnapshot[cat]).filter(k => k !== '_isCategory').length 
            : 0;

        targetItems.forEach((item, idx) => {
            let finalName = (shouldNumber && allExistingItems.includes(item)) ? getNumberedName(item, currentAll) : item;
            if (shouldNumber) currentAll.push(finalName);
            updates[`travels/${currentTravel}/${currentUser}/current/${cat}/${finalName}`] = { out: 'X', in: 'X', index: catItemCount + idx };
        });
        update(ref(database), updates).then(() => {
            document.getElementById('bulkItemText').value = '';
            alert("아이템 처리 완료!");
        });
    });
};

window.updateStatus = (cat, item, field, val) => {
    set(ref(database, `travels/${currentTravel}/${currentUser}/current/${cat}/${item}/${field}`), statusToggle[val]);
};

window.confirmDelete = (cat, item = null) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const path = item ? `current/${cat}/${item}` : `current/${cat}`;
    remove(ref(database, `travels/${currentTravel}/${currentUser}/${path}`));
};

window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };

function refreshSelectMenus() {
    const options = categories.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="미분류">없음</option>`;
    const catSelect = document.getElementById('categorySelect');
    const bulkSelect = document.getElementById('bulkItemCategorySelect');
    if (catSelect) catSelect.innerHTML = options;
    if (bulkSelect) bulkSelect.innerHTML = options;
}

window.loadData = () => {
    const select = document.getElementById('travelSelect');
    if (select && select.value) currentTravel = select.value;
    if (currentUnsubscribe) currentUnsubscribe();
    currentUnsubscribe = onValue(ref(database, `travels/${currentTravel}/${currentUser}/current`), (snapshot) => {
        const data = snapshot.val();
        currentDataSnapshot = data; 
        const tbody = document.getElementById('checklistBody');
        tbody.innerHTML = ''; categories = [];
        if (!data) { refreshSelectMenus(); return; }

        const sortedCats = Object.keys(data)
            .filter(cat => data[cat]._isCategory)
            .sort((a, b) => (data[a]._isCategory.index || 0) - (data[b]._isCategory.index || 0));

        sortedCats.forEach((cat, cIdx) => {
            categories.push(cat);
            const isFolded = foldedCategories.has(cat);
            tbody.innerHTML += `<tr class="category-row" draggable="true" data-type="category" data-id="${cat}">
                <td colspan="3"><div class="name-cell">
                <button class="fold-btn" onclick="toggleFold(event, '${cat}')" ontouchstart="toggleFold(event, '${cat}')">${isFolded ? '▶' : '▼'}</button>
                <span class="row-num">${cIdx+1}.</span><span class="name-text">${cat}</span>
                <button class="mini-del-btn" onclick="confirmDelete('${cat}')">X</button></div></td></tr>`;
            
            const sortedItems = Object.keys(data[cat])
                .filter(k => k !== '_isCategory')
                .sort((a, b) => (data[cat][a].index || 0) - (data[cat][b].index || 0));

            sortedItems.forEach((item, iIdx) => {
                const vals = data[cat][item];
                tbody.innerHTML += `<tr draggable="true" data-type="item" data-category="${cat}" data-id="${item}" class="${isFolded ? 'hidden-item' : ''}">
                    <td><div class="name-cell" style="padding-left: 32px;">
                    <span class="row-num">${iIdx+1})</span><span class="name-text">${item}</span>
                    <button class="mini-del-btn" onclick="confirmDelete('${cat}', '${item}')">X</button></div></td>
                    <td class="status-col"><button class="status-btn status-${vals.out || 'X'}" onclick="updateStatus('${cat}', '${item}', 'out', '${vals.out || 'X'}')">${vals.out || 'X'}</button></td>
                    <td class="status-col"><button class="status-btn status-${vals.in || 'X'}" onclick="updateStatus('${cat}', '${item}', 'in', '${vals.in || 'X'}')">${vals.in || 'X'}</button></td></tr>`;
            });
        });
        refreshSelectMenus();
        addDragEvents();
    });
};

async function syncOrderToDB() {
    if (isLocked) return;
    const updates = {};
    let catIdx = 0, itemIdx = 0, currentCat = '';
    document.querySelectorAll('#checklistBody tr').forEach(row => {
        if (row.dataset.type === 'category') {
            currentCat = row.dataset.id;
            updates[`travels/${currentTravel}/${currentUser}/current/${currentCat}/_isCategory/index`] = catIdx++;
            itemIdx = 0;
        } else {
            updates[`travels/${currentTravel}/${currentUser}/current/${currentCat}/${row.dataset.id}/index`] = itemIdx++;
        }
    });
    await update(ref(database), updates);
}

function addDragEvents() {
    const rows = document.querySelectorAll('#checklistBody tr');
    let draggedRows = [];

    const onDragStart = (target) => {
        if (isLocked) return;
        target.classList.add('dragging');
        if (target.dataset.type === 'category') {
            draggedRows = [target, ...document.querySelectorAll(`tr[data-type=\"item\"][data-category=\"${target.dataset.id}\"]`)];
        } else {
            draggedRows = [target];
        }
        draggedRows.forEach(r => r.classList.add('dragging'));
    };

    const onDragEnd = async () => {
        if (draggedRows.length === 0) return;
        draggedRows.forEach(r => r.classList.remove('dragging'));
        draggedRows = [];
        await syncOrderToDB();
    };

    const onDragMove = (y, target) => {
        if (isLocked || !target || draggedRows.includes(target)) return;
        const bounding = target.getBoundingClientRect();
        const offset = y - bounding.top;

        if (draggedRows[0].dataset.type === 'category' && target.dataset.type === 'category') {
            const targetItems = document.querySelectorAll(`tr[data-type=\"item\"][data-category=\"${target.dataset.id}\"]`);
            const last = targetItems.length > 0 ? targetItems[targetItems.length - 1] : target;
            offset > bounding.height / 2 ? last.after(...draggedRows) : target.before(...draggedRows);
        } else if (draggedRows[0].dataset.type === 'item' && target.dataset.type === 'item' && target.dataset.category === draggedRows[0].dataset.category) {
            offset > bounding.height / 2 ? target.after(draggedRows[0]) : target.before(draggedRows[0]);
        }
    };

    rows.forEach(row => {
        row.ondragstart = () => onDragStart(row);
        row.ondragend = onDragEnd;
        row.ondragover = (e) => {
            e.preventDefault();
            onDragMove(e.clientY, e.target.closest('tr'));
        };

        row.addEventListener('touchstart', (e) => {
            if (isLocked) return;
            if (e.target.closest('button') || e.target.closest('select') || e.target.closest('textarea')) return;
            onDragStart(row);
        }, { passive: false });

        row.addEventListener('touchmove', (e) => {
            if (isLocked || draggedRows.length === 0) return;
            e.preventDefault();
            const touchY = e.touches[0].clientY;
            const target = document.elementFromPoint(e.touches[0].clientX, touchY)?.closest('tr');
            onDragMove(touchY, target);
        }, { passive: false });

        row.addEventListener('touchend', onDragEnd);
    });
}

window.loadData();