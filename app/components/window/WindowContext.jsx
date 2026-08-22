import { createContext, useContext, useEffect, useState } from 'react';
import { Titlebar } from './Titlebar';
import { TitlebarContextProvider } from './TitlebarContext';
const WindowContext = createContext(undefined);
export const WindowContextProvider = ({ children, titlebar }) => {
    const [initProps, setInitProps] = useState();
    const defaultTitlebar = {
        title: 'desktop App',
        icon: 'appIcon.png',
        titleCentered: false,
        menuItems: [],
    };
    // Merge default titlebar props with user defined props
    titlebar = { ...defaultTitlebar, ...titlebar };
    useEffect(() => {
        // Load window init props
        window.api.invoke('init-window').then((value) => setInitProps(value));
        // Add class to parent element
        const parent = document.querySelector('.window-content')?.parentElement;
        if (parent) {
            parent.classList.add('window-frame');
        }
    }, []);
    return (<WindowContext.Provider value={{ titlebar, window: initProps }}>
      <TitlebarContextProvider>
        <Titlebar />
      </TitlebarContextProvider>
      <WindowContent>{children}</WindowContent>
    </WindowContext.Provider>);
};
const WindowContent = ({ children }) => {
    return <div className="window-content">{children}</div>;
};
export const useWindowContext = () => {
    const context = useContext(WindowContext);
    if (context === undefined) {
        throw new Error('useWindowContext must be used within a WindowContextProvider');
    }
    return context;
};
