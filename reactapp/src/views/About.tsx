import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AboutTranslations } from "@/types/shared/aboutTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import CollapsibleText from "@components/views/CollapsibleText.tsx";
import { Paths } from "@routes/paths.ts";
import Logo from "@images/home/logo320.png";
import "@styles/views/about.scss";

export default function About(): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.About]);
    const navigate = useNavigate();

    return (
        <div className={"about"}>
            <div className={"about__header"}>
                <div>
                    <button className={"text-button--white"} onClick={() => navigate(Paths.HomePath)}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        {t(GeneralTranslations.BUTTON_RETURN_HOME)}
                    </button>
                </div>
                <div className={"about__header-title"}>
                    <p>{t(AboutTranslations.ABOUT, { ns: TranslationNamespaces.About })}</p>
                    <img src={Logo} alt={"logo"} />
                </div>
                <div />
            </div>
            <div className={"about__contents-container"}>
                <div className={"about__contents"}>
                    <p>{t(AboutTranslations.STORY, { ns: TranslationNamespaces.About })}</p>
                    <div className={"about__section-container"}>
                        <div className={"about__section"}>
                            <b>{t(AboutTranslations.USAGE_TITLE, { ns: TranslationNamespaces.About })}</b>
                            <div className={"about__usage"}>
                                <p>{t(AboutTranslations.USAGE_1, { ns: TranslationNamespaces.About })}</p>
                                <p>{t(AboutTranslations.USAGE_2, { ns: TranslationNamespaces.About })}</p>
                            </div>
                        </div>
                    </div>
                    <div className={"about__section-container"}>
                        <div className={"about__section"}>
                            <b>{t(AboutTranslations.RESEARCH, { ns: TranslationNamespaces.About })}</b>
                            <CollapsibleText title={AboutTranslations.CONCEPT_TITLE}
                                             descriptions={[AboutTranslations.CONCEPT_1, AboutTranslations.CONCEPT_2, AboutTranslations.CONCEPT_3]}
                                             references={["¹Van den Heuvel-Panhuizen, M. and Drijvers, P. 2020. Realistic Mathematics Education. Encyclopedia of Mathematics Education (2020), 713-717. DOI:10.1007/978-3-030-15789-0_170",
                                                 "²Van Reeuwijk, M. 2001. From Informal to Formal, Progressive Formalization: An Example on Solving Systems of Equations. (2001)."]}
                            />
                            <CollapsibleText title={AboutTranslations.AGENT_TITLE}
                                             descriptions={[AboutTranslations.AGENT_1, AboutTranslations.AGENT_2, AboutTranslations.AGENT_3]}
                                             references={["⁴Dai, L., Jung, M. M., Postma, M., and Louwerse, M. M. 2022. A Systematic Review of Pedagogical Agent Research: Similarities, Differences and Unexplored Aspects. Computers& Education 190 (2022), 104607. DOI:10.1016/j.compedu.2022.104607",
                                                 "⁵Baylor, A. L. and Kim, Y. 2004. Pedagogical Agent Design: The Impact of Agent Realism, Gender, Ethnicity, and Instructional Role. In International Conference on Intelligent Tutoring Systems. Springer Berlin Heidelberg, 592–603. DOI:10.1007/978-3-540-30139-4_56",
                                                 "⁶Wigfield, A. and Eccles, J. S. 2000. Expectancy–Value Theory of Achievement Motivation. Contemporary Educational Psychology 25, 1 (2000), 68-81. DOI:10.1006/ceps.1999.1015"]}
                            />
                        </div>
                    </div>
                    <div className={"about__section-container"}>
                        <div className={"about__section"}>
                            <b>{t(AboutTranslations.TEAM, { ns: TranslationNamespaces.About })}</b>
                            <div className={"about__team"}>
                                <div className={"about__team-member"}>
                                    <b>Prof. Dr. Tomohiro Nagashima</b>
                                    <p>{t(AboutTranslations.INTRO_NAGASHIMA, { ns: TranslationNamespaces.About })}</p>
                                    <p>
                                        <strong style={{ color: "var(--shade-primary-blue)" }}>Website:</strong>{" "}
                                        <a style={{ color: "var(--shade-primary-blue" }} href={"https://tomonag.org/"}>
                                            tomonag.org
                                        </a>
                                    </p>
                                    <p>
                                        <strong style={{ color: "var(--shade-primary-blue)" }}>E-Mail:</strong> nagashima[at]cs.uni-saarland.de
                                    </p>
                                </div>
                                <div className={"about__team-member"}>
                                    <b>{t(AboutTranslations.STUDENTS, { ns: TranslationNamespaces.About })}</b>
                                    <p>{t(AboutTranslations.INTRO_BONAVENTURA, { ns: TranslationNamespaces.About })}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
