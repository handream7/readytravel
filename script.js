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
let selectedTravelToLoad = '';
const statusCycle = { 'X': '△', '△': 'O', 'O': 'X' };

onValue(ref(database, 'travelNames'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        travels = Object.keys(data);
        const select = document.getElementById('travelSelect');
        const currentVal = select.value;
        select.innerHTML = travels.map(t => `<option value="${t}">${t}</option>`).join('');
        if (travels.includes(currentVal)) select.value = currentVal;
    }
});

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

window.addNewTravel = () => {
    const name = prompt("새 여행 이름을 입력하세요:");
    if (name) {
        set(ref(database, `travelNames/${name}`), true).then(() => {
            currentTravel = name;
            loadData();
        });
    }
};

window.saveCurrentList = () => {
    const title = prompt("목록 저장 이름을 입력하세요:");
    if (!title) return;
    get(ref(database, `travels/${currentTravel}/${currentUser}`)).then((snapshot) => {
        if (snapshot.exists()) {
            set(ref(database, `travels/${title}/${currentUser}`), snapshot.val());
            set(ref(database, `travelNames/${title}`), true).then(() => {
                alert(`'${title}' 저장 완료!`);
            });
        }
    });
};

window.resetCurrentList = () => {
    if (confirm("정말 현재 체크리스트를 싹 지우시겠습니까?")) {
        remove(ref(database, `travels/${currentTravel}/${currentUser}`)).then(() => {
            alert("초기화되었습니다.");
        });
    }
};

window.openCategoryModal = () => {
    document.getElementById('currentCategoryList').innerHTML = categories.map(c => `<span class="cat-tag">${c}</span>`).join('');
    document.getElementById('categoryModal').style.display = 'flex';
};

window.saveCategory = () => {
    const category = document.getElementById('newCategoryName').value.trim();
    if (!category) return;
    if (categories.includes(category)) return alert("이미 존재합니다!");
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/_isCategory`), true).then(() => {
        document.getElementById('newCategoryName').value = '';
        closeModal('categoryModal');
    });
};

window.addItem = () => {
    refreshSelectMenus();
    document.getElementById('itemModal').style.display = 'flex';
};

window.saveItem = () => {
    const category = document.getElementById('categorySelect').value;
    const itemName = document.getElementById('newItemName').value.trim();
    if (!itemName) return;
    set(ref(database, `travels/${currentTravel}/${currentUser}/${category}/${itemName}`), {
        prep_out: 'X', done_out: 'X', prep_in: 'X', done_in: 'X'
    }).then(() => {
        document.getElementById('newItemName').value = '';
        closeModal('itemModal');
    });
};

window.openLoadModal = () => {
    document.getElementById('travelListDisplay').innerHTML = travels.map(t => `<li id="list-${t}" onclick="setSelectToLoad('${t}')">✈️ ${t}</li>`).join('');
    refreshSelectMenus();
    document.getElementById('loadModal').style.display = 'flex';
};

window.setSelectToLoad = (name) => {
    selectedTravelToLoad = name;
    document.querySelectorAll('.data-list li').forEach(li => li.classList.remove('selected'));
    const target = document.getElementById(`list-${name}`);
    if (target) target.classList.add('selected');
};

window.confirmLoadTravel = () => {
    if (!selectedTravelToLoad) return alert("여행을 선택하세요.");
    if (confirm(`'${selectedTravelToLoad}' 목록을 불러오시겠습니까?`)) {
        document.getElementById('travelSelect').value = selectedTravelToLoad;
        currentTravel = selectedTravelToLoad;
        loadData();
        closeModal('loadModal');
    }
};

window.uploadBulkCategories = () => {
    const text = document.getElementById('bulkCategoryText').value;
    if (!text.trim()) return;
    const cats = text.split('\n').map(c => c.trim()).filter(c => c !== "");
    const updates = {};
    cats.forEach(c => { updates[`travels/${currentTravel}/${currentUser}/${c}/_isCategory`] = true; });
    update(ref(database), updates).then(() => { 
        document.getElementById('bulkCategoryText').value = ''; 
        alert(`총 ${cats.length}개의 카테고리가 생성되었습니다.`);
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
        alert(`총 ${items.length}개의 아이템이 생성되었습니다.`);
    });
};

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

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

        const sortedCats = Object.keys(data).sort();
        sortedCats.forEach((cat, catIdx) => {
            categories.push(cat);
            tbody.innerHTML += `<tr class="category-row"><td colspan="6">${catIdx + 1}. ${cat}</td></tr>`;
            const items = Object.keys(data[cat]).filter(k => k !== '_isCategory').sort();
            items.forEach((item, itemIdx) => {
                const vals = data[cat][item];
                tbody.innerHTML += `
                    <tr>
                        <td style="text-align:left; padding-left:35px;">${itemIdx + 1}) ${item}</td>
                        <td><button class="status-btn status-${vals.prep_out}" onclick="updateStatus('${cat}', '${item}', 'prep_out', '${vals.prep_out}')">${vals.prep_out}</button></td>
                        <td><button class="status-btn status-${vals.done_out}" onclick="updateStatus('${cat}', '${item}', 'done_out', '${vals.done_out}')">${vals.done_out}</button></td>
                        <td><button class="status-btn status-${vals.prep_in}" onclick="updateStatus('${cat}', '${item}', 'prep_in', '${vals.prep_in}')">${vals.prep_in}</button></td>
                        <td><button class="status-btn status-${vals.done_in}" onclick="updateStatus('${cat}', '${item}', 'done_in', '${vals.done_in}')">${vals.done_in}</button></td>
                        <td><button class="delete-btn" onclick="deleteItem('${cat}', '${item}')">삭제</button></td>
                    </tr>`;
            });
        });
        refreshSelectMenus();
    });
};

window.loadData();