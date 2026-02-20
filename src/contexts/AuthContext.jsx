import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, githubProvider, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up with email and password
    async function signup(email, password, name, role = 'user') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // Store role in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email,
            name,
            role,
            createdAt: new Date().toISOString(),
        });
        setUserRole(role);
        return userCredential;
    }

    // Login with email and password
    async function login(email, password, role = 'user') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Update role in Firestore based on toggle selection
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            // Update role to what the user selected in the toggle
            await updateDoc(userRef, { role });
            setUserRole(role);
        } else {
            // Create user doc if it doesn't exist
            await setDoc(userRef, {
                email: userCredential.user.email,
                name: userCredential.user.displayName || email.split('@')[0],
                role,
                createdAt: new Date().toISOString(),
            });
            setUserRole(role);
        }
        return userCredential;
    }

    // Google sign-in
    async function googleSignIn(role = 'user') {
        const result = await signInWithPopup(auth, googleProvider);
        const userRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                email: result.user.email,
                name: result.user.displayName,
                role,
                createdAt: new Date().toISOString(),
            });
        } else {
            // Update role to what the user selected in the toggle
            await updateDoc(userRef, { role });
        }
        setUserRole(role);
        return result;
    }

    // GitHub sign-in
    async function githubSignIn(role = 'user') {
        const result = await signInWithPopup(auth, githubProvider);
        const userRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                email: result.user.email,
                name: result.user.displayName || result.user.email?.split('@')[0],
                role,
                createdAt: new Date().toISOString(),
            });
        } else {
            // Update role to what the user selected in the toggle
            await updateDoc(userRef, { role });
        }
        setUserRole(role);
        return result;
    }

    // Logout
    async function logout() {
        setUserRole(null);
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserRole(userDoc.data().role);
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                }
            } else {
                setUserRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        isAdmin: userRole === 'admin',
        isLoggedIn: !!currentUser,
        signup,
        login,
        googleSignIn,
        githubSignIn,
        logout,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
