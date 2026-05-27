import { ReactNode, createContext, useContext, useState } from "react";
import { IUser } from "@/types/studies/user.ts";
import { IStudent } from "@/types/student/student.ts";

export type AuthContextType = {
    user: IUser | undefined;
    login: (user: IUser) => void;
    logout: () => void;
    student: IStudent | undefined;
    loginStudent: (student: IStudent) => void;
    logoutStudent: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
    const jsonString = localStorage.getItem("user");
    let currentUser: IUser | undefined;
    if (jsonString !== null) {
        currentUser = JSON.parse(jsonString);
    }

    const studentJsonString = localStorage.getItem("student");
    let currentStudent: IStudent | undefined;
    if (studentJsonString !== null) {
        currentStudent = JSON.parse(studentJsonString);
    }

    const [user, setUser] = useState<IUser | undefined>(currentUser);
    const [student, setStudent] = useState<IStudent | undefined>(currentStudent);

    const login = (user: IUser): void => {
        setUser(user);
        localStorage.setItem("user", JSON.stringify(user));
    };

    const logout = (): void => {
        setUser(undefined);
        localStorage.removeItem("user");
    };

    const loginStudent = (student: IStudent): void => {
        setStudent(student);
        localStorage.setItem("student", JSON.stringify(student));
    };

    const logoutStudent = (): void => {
        setStudent(undefined);
        localStorage.removeItem("student");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, student, loginStudent, logoutStudent }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
    return useContext(AuthContext) as AuthContextType;
}
