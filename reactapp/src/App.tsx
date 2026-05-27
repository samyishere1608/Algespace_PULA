import AuthProvider from "@/contexts/AuthProvider.tsx";
import { configure } from "axios-hooks";
import { ErrorBoundary } from "react-error-boundary";
import "reflect-metadata";
import axiosInstance from "@/types/shared/axiosInstance.ts";
import { HomeErrorFallback } from "@components/shared/ErrorScreen.tsx";
import Routes from "@routes/Routes.tsx";
import useAppHeight from "@hooks/useAppHeight.ts";
import "@styles/shared/buttons.scss";
import "./i18n";

export default function App() {
    useAppHeight();
    configure({ axios: axiosInstance });

    return (
        <ErrorBoundary key={"app-boundary"} FallbackComponent={HomeErrorFallback}>
            <AuthProvider>
                <Routes />
            </AuthProvider>
        </ErrorBoundary>
    );
}
