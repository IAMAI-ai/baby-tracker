import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, serverTimestamp, query, orderBy, 
    limit, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 1. Firebase 配置信息
const firebaseConfig = {
  apiKey: "AIzaSyCckGV4SJzHjUW2xMKrvtdv6PRb3js-0h8",
  authDomain: "baby-tracker-5464f.firebaseapp.com",
  projectId: "baby-tracker-5464f",
  storageBucket: "baby-tracker-5464f.firebasestorage.app",
  messagingSenderId: "42442664907",
  appId: "1:42442664907:web:0297aa44d34bfb5637e44e",
  measurementId: "G-0RX7DMW4XY"
};

// 2. 初始化服务
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * 保存记录
 */
async function saveRecord(type, familyId) {
    try {
        const idStr = String(familyId); 
        await addDoc(collection(db, "baby_logs"), {
            type: type,
            familyId: idStr,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("保存失败:", e);
        return false;
    }
}

/**
 * 实时监听：增加前端强制排序逻辑
 */
function listenToLogs(familyId, callback) {
    const idStr = String(familyId); 
    const q = query(
        collection(db, "baby_logs"), 
        where("familyId", "==", idStr), 
        orderBy("timestamp", "desc"), 
        limit(50) 
    );

    return onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // 如果 timestamp 为空（通常是刚写入还未同步），使用当前本地时间
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            const timeStr = `${year}-${month}-${day} ${hours}:${minutes}`;
            const fullTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            // 将日期对象存入，用于前端排序
            logs.push({ id: doc.id, ...data, timeStr, fullTime, _dateObj: date });
        });
        
        // 【关键优化】：在返回给页面前，强制按日期对象降序排列
        // 这样在 updateRecord 修改时间后，列表会立即重排
        logs.sort((a, b) => b._dateObj - a._dateObj);
        
        console.log(`[实时监听] 更新并重排了 ${logs.length} 条数据`);
        callback(logs);
    }, (error) => {
        console.error("Firebase 监听报错:", error.message);
    });
}

/**
 * 更新记录
 */
async function updateRecord(id, newTimeStr) {
    try {
        const newDate = new Date(newTimeStr);
        await updateDoc(doc(db, "baby_logs", id), { 
            timestamp: newDate 
        });
        return true;
    } catch (e) { 
        console.error("更新失败:", e);
        return false; 
    }
}

/**
 * 删除单条记录
 */
async function deleteRecord(id) {
    if(confirm("确定要删除这条记录吗？")) {
        try {
            await deleteDoc(doc(db, "baby_logs", id));
            return true;
        } catch (e) { return false; }
    }
}

/**
 * 一键清空当前家庭的所有记录
 */
async function clearAllRecords(familyId) {
    try {
        const idStr = String(familyId);
        const q = query(collection(db, "baby_logs"), where("familyId", "==", idStr));
        const querySnapshot = await getDocs(q);
        
        const deletePromises = querySnapshot.docs.map(document => 
            deleteDoc(doc(db, "baby_logs", document.id))
        );
        
        await Promise.all(deletePromises);
        return true;
    } catch (e) {
        console.error("清空失败:", e);
        return false;
    }
}

/**
 * 上传头像
 */
async function uploadAvatar(file, familyId) {
    try {
        const storageRef = ref(storage, `baby_info/${familyId}_avatar.jpg`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        localStorage.setItem(`avatar_${familyId}`, url);
        return url;
    } catch (e) { return null; }
}

// 导出到全局
window.saveRecord = saveRecord;
window.listenToLogs = listenToLogs;
window.updateRecord = updateRecord;
window.deleteRecord = deleteRecord;
window.clearAllRecords = clearAllRecords;
window.uploadAvatar = uploadAvatar;
