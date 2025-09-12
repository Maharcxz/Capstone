// Firebase Configuration and Initialization

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGnk5t973s-dFvZsK1VJW3yUpQDuAIPuc",
    authDomain: "capstone-66529.firebaseapp.com",
    projectId: "capstone-66529",
    storageBucket: "capstone-66529.firebasestorage.app",
    messagingSenderId: "202809244213",
    appId: "1:202809244213:web:c0ee9b358d4ab83579cf7c",
    measurementId: "G-ZGV2HWPZ46",
    databaseURL: "https://capstone-66529-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.database();

// Global admin mode state
let isAdminMode = false;

// Reference to pre-orders collection in the database
const preOrdersRef = db.ref('preOrders');

// Function to save pre-order to Firebase
function savePreOrderToFirebase(preOrder) {
    return preOrdersRef.push(preOrder);
}

// Function to get all pre-orders from Firebase
async function getAllPreOrders() {
    const snapshot = await preOrdersRef.once('value');
    const preOrders = [];
    
    snapshot.forEach(childSnapshot => {
        const preOrder = childSnapshot.val();
        preOrder.id = childSnapshot.key;
        preOrders.push(preOrder);
    });
    
    return preOrders;
}

// Function to listen for new pre-orders
function listenForNewPreOrders(callback) {
    preOrdersRef.on('child_added', snapshot => {
        const preOrder = snapshot.val();
        preOrder.id = snapshot.key;
        callback(preOrder);
    });
}

// Function to stop listening for new pre-orders
function stopListeningForNewPreOrders() {
    preOrdersRef.off('child_added');
}

// Function to sign in with email and password
async function signInWithEmailAndPassword(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
}

// Function to sign out
async function signOut() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
}

// Function to check if user is authenticated
function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}

// Export Firebase services and functions
window.firebaseServices = {
    auth,
    db,
    preOrdersRef,
    savePreOrderToFirebase,
    getAllPreOrders,
    listenForNewPreOrders,
    stopListeningForNewPreOrders,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};