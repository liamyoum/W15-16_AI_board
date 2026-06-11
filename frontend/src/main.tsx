// React 앱의 시작점
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// HTML의 root 요소를 찾아 React 앱의 첫 컴포넌트인 App을 붙인다.
ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
