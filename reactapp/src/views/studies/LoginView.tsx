import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAxios from "axios-hooks";
import { ReactElement, useState } from "react";
import { useErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { StudyType } from "@/types/studies/enums.ts";
import { IUser } from "@/types/studies/user.ts";
import Loader from "@components/shared/Loader.tsx";
import { Paths } from "@routes/paths.ts";
import Logo from "@images/home/logo640.png";
import "@styles/views/login.scss";
import { AgentCondition } from "@/types/flexibility/enums.ts";


export default function LoginView(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const { showBoundary } = useErrorBoundary();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [password, setPassword] = useState<string>("");

    const [error, setError] = useState<[boolean, string]>([false, ErrorTranslations.ERROR_LOGIN]);

    const [{ loading }, executeLogin] = useAxios(
        {
            url: "user/authenticate",
            method: "POST"
        },
        { manual: true }
    );

    return (
        <div className={"login__background"}>
            <button className={"text-button--white login__return-button"} onClick={() => navigate(Paths.HomePath)}>
                <FontAwesomeIcon icon={faArrowLeft} />
                {t(GeneralTranslations.BUTTON_RETURN_HOME)}
            </button>
            <div className={"login__container"}>
                <img src={Logo} alt={"logo"} />
                <form className={"login__form"}>
                    <p>{t(GeneralTranslations.LOGIN_TEXT)}</p>
                    <div className={"input__container"}>
                        <label>{t(GeneralTranslations.LOGIN_NAME)}</label>
                        <input autoFocus className={"input__box"} type={"text"} value={username} placeholder="Username" maxLength={20} onChange={handleUsernameChange}
                               onKeyDown={handleKeyDown} />
                    </div>
                    <div className={"input__container"}>
                        <label>{t(GeneralTranslations.LOGIN_PW)}</label>
                        <div className={"input__password-box"}>
                            <input className={"input__box"} type={showPassword ? "text" : "password"} value={password} placeholder="Password" maxLength={20}
                                   onChange={handlePasswordChange} onKeyDown={handleKeyDown} />
                            <span className={"input__password-eye"} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <FontAwesomeIcon icon={faEye} /> : <FontAwesomeIcon icon={faEyeSlash} />}
                            </span>
                        </div>
                    </div>
                </form>
                {loading && <Loader />}
                {error[0] && <p className={"login__error"}>{t(error[1], { ns: TranslationNamespaces.Error })}</p>}
                <button className={"button primary-button"} disabled={username === "" || password === "" || loading} onClick={handleLogin}>
                    Login
                </button>
            </div>
        </div>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleUsernameChange(event: any): void {
        if (error) {
            setError([false, ""]);
        }

        setUsername(event.target.value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handlePasswordChange(event: any): void {
        if (error) {
            setError([false, ""]);
        }

        setPassword(event.target.value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleKeyDown(event: any): void {
        if (event.key === "Enter" && username !== "" && password !== "" && !loading) {
            handleLogin();
        }
    }

    async function handleLogin() {
        let user: IUser;

        try {
            const response = await executeLogin({
                data: { username, password }
            });

            user = response.data as IUser;
        } catch (error) {
            console.log(error);
            setError([true, ErrorTranslations.ERROR_LOGIN]);
            return;
        }
        console.log(user);
        try {
            if (user.expirationDate && isExpired(user.expirationDate)) {
                setError([true, ErrorTranslations.ERROR_EXPIRED_STUDY]);
            } else {
                const path: string | undefined = getPathToStudy(user.studyType, user.studyId, user.agentCondition);
                if (path !== undefined) {
                    // Only set user if data is valid
                    login(user);
                    navigate(path);
                } else {
                    setError([true, ErrorTranslations.ERROR_INVALID_STUDY]);
                }
            }
        } catch (error) {
            showBoundary(error);
        }
    }

    function isExpired(dateStr: string): boolean {
        const date: Date = new Date(dateStr);
        const currentDate: Date = new Date();
        return date < currentDate;
    }

    function getPathToStudy(studyType: number, studyId: number, agent: AgentCondition | undefined) : string | undefined {
        if (studyType === StudyType.CKStudy) {
            return Paths.CKStudyPath + studyId;
        } else if (studyType === StudyType.FlexibilityTest) {
            return Paths.FlexibilityStudyExamplesPath;
        } else if (studyType === StudyType.FlexibilityStudy) {
            if(agent== AgentCondition.PersonalMotivationalAgent || agent == AgentCondition.MotivationIntentionAgent)
                return Paths.FlexibilityStudyOptional+ studyId;
            else
                return Paths.FlexibilityStudyPath + studyId;
        }
        return undefined;
    }
}
