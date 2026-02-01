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

let currentUser = '강민성';
let currentTravel = 'first';
let categories = [];
let travels = ['first'];
let selectedTravelToLoad = ''; // 불러오기에서 선택된 여행 이름
const statusCycle = { 'X': '△', '△': 'O', 'O': 'X' };

// 유저 전환
window.switchUser = (user) => {
    currentUser = user;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === user);
    });
    loadData();
};

function refreshSelectMenus() {
    const bulkItemCatSelect = document.getElementById('bulkItemCategorySelect');
    const singleCatSelect = document.getElementById('categorySelect');
    const optionsHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('') + `<option value="미분류">없음</option>`;
    if (bulkItemCatSelect) bulkItemCatSelect.innerHTML = optionsHTML;
    if (singleCatSelect) singleCatSelect.innerHTML = optionsHTML;
}

// 여행 추가 (드롭다운 목록만 갱신)
window.addNewTravel = () => {
    const name = prompt("새 여행 이름을 입력하세요:");
    if (name) {
        if (!travels.includes(name)) travels.push(name);
        updateTravelSelect();
        currentTravel = name;
        document.getElementById('travelSelect').value = name;
        loadData();
    }
};

function updateTravelSelect() {
    const select = document.getElementById('travelSelect');
    select.innerHTML = travels.map(t => `<option value="${t}">${t}</option>`).join('');
}

// 목록 저장하기 (현재 리스트를 특정 이름으로 DB에 저장)
window.saveCurrentList = () => {
    const title = prompt("이 체크리스트의 저장 이름을 입력하세요:");
    if (!title) return;

    // 현재 로드된 데이터를 가져와서 새 경로에 복사
    get(ref(database, `travels/${currentTravel}/${currentUser}`)).then((snapshot) => {
        if (snapshot.exists()) {
            set(ref(database, `travels/${title}/${currentUser}`), snapshot.val()).then(() => {
                alert(`'${title}' 여행 목록이 저장되었습니다.`);
                if (!travels.includes(title)) travels.push(title);
                updateTravelSelect();
            });
        } else {
            alert("저장할 데이터가 없습니다.");
        }
    });
};

// 통합 모달 열기
window.openLoadModal = () => {
    refreshTravelListDisplay();
    refreshSelectMenus();
    document.getElementById('loadModal').style.display = 'flex';
};

function refreshTravelListDisplay() {
    const listDisp = document.getElementById('travelListDisplay');
    listDisp.innerHTML = travels.map(t => `<li id="list-${t}" onclick="setSelectToLoad('${t}')">✈️ ${t}</li>`).join('');
}

window.setSelectToLoad = (name) => {
    selectedTravelToLoad = name;
    document.querySelectorAll('.data-list li').forEach(li => li.classList.remove('selected'));
    document.getElementById(`list-${name}`).classList.add('selected');
};

// 불러오기 확인 버튼
window.confirmLoadTravel = () => {
    if (!selectedTravelToLoad) return alert("불러올 여행을 먼저 선택하세요.");
    if (confirm(`'${selectedTravelToLoad}' 목록을 불러오시겠습니까?\n현재 화면의 내용이 바뀝니다.`)) {
        document.getElementById('travelSelect').value = selectedTravelToLoad;
        currentTravel = selectedTravelToLoad;
        loadData();
        closeModal('loadModal');
    }
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.uploadBulkCategories = () => {
    const text = document.getElementById('bulkCategoryText').value;
    if (!text.trim()) return;
    const cats = text.split('\n').map(c => c.trim()).filter(c => c !== "");
    const updates = {};
    cats.forEach(c => { updates[`travels/${currentTravel}/${currentUser}/${c}/_isCategory`] = true; });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkCategoryText').value = '';
    });
};

window.uploadBulkItems = () => {
    const category = document.getElementById('bulkItemCategorySelect').value;
    const text = document.getElementById('bulkItemText').value;
    if (!text.trim()) return;
    const items = text.split('\n').map(i => i.trim()).filter(i => i !== "");
    const updates = {};
    items.forEach(item => {
        updates[`travels/${currentTravel}/${currentUser}/${category}/${item}`] = {
            prep_out: 'X', done_out: 'X', prep_in: 'X', done_in: 'X'
        };
    });
    update(ref(database), updates).then(() => {
        document.getElementById('bulkItemText').value = '';
    });
};

window.addItem = () => {
    refreshSelectMenus();
    document.getElementById('itemModal').style.display = 'flex';
};

window.saveItem = () => {
    const category = document.getElementById('categorySelect').value;
    const itemName = document.getElementById('newItemName').value;
    if (!itemName) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${itemName}`), {
        prep_out: 'X', done_out: 'X', prep_in: 'X', done_in: 'X'
    }).then(() => {
        document.getElementById('newItemName').value = '';
        closeModal('itemModal');
    });
};

window.updateStatus = (category, item, field, currentVal) => {
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${item}/${field}`), statusCycle[currentVal]);
};

window.deleteItem = (category, item) => {
    if(confirm('삭제하시겠습니까?')) remove(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${item}`));
};

window.loadData = () => {
    currentTravel = document.getElementById('travelSelect').value;
    onValue(ref(database, `travels/${currentTravel}/${currentUser}`), (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('checklistBody');
        tbody.innerHTML = '';
        categories = [];
        if (!data) { refreshSelectMenus(); return; }
        for (let category in data) {
            categories.push(category);
            tbody.innerHTML += `<tr class="category-row"><td colspan="6">${category}</td></tr>`;
            for (let item in data[category]) {
                if (item === '_isCategory') continue;
                const vals = data[category][item];
                tbody.innerHTML += `
                    <tr>
                        <td style="text-align:left; padding-left:35px;">${item}</td>
                        <td><button class="status-btn status-${vals.prep_out}" onclick="updateStatus('${category}', '${item}', 'prep_out', '${vals.prep_out}')">${vals.prep_out}</button></td>
                        <td><button class="status-btn status-${vals.done_out}" onclick="updateStatus('${category}', '${item}', 'done_out', '${vals.done_out}')">${vals.done_out}</button></td>
                        <td><button class="status-btn status-${vals.prep_in}" onclick="updateStatus('${category}', '${item}', 'prep_in', '${vals.prep_in}')">${vals.prep_in}</button></td>
                        <td><button class="status-btn status-${vals.done_in}" onclick="updateStatus('${category}', '${item}', 'done_in', '${vals.done_in}')">${vals.done_in}</button></td>
                        <td><button class="delete-btn" onclick="deleteItem('${category}', '${item}')">삭제</button></td>
                    </tr>`;
            }
        }
        refreshSelectMenus();
    });
};

window.loadData();