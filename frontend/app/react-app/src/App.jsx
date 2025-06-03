import { HashRouter, Routes, Route } from "react-router-dom";
import './css/App.css';
import HomePage from './page/HomePage';
import LoginPage from './page/LoginPage';
import useUserInfo from './hooks/useUserInfo';

function App() {
    const { user, loading } = useUserInfo();

    if (loading) {
        return <p>...</p>;
    }
    if (!user) {
        return <LoginPage />;
    }
    return (
        <HashRouter>
            <HomePage user={user}/>
        </HashRouter>
    );
}

export default App;
