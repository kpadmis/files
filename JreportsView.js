import React, { useState, useEffect } from 'react';
import ReportsService from "../../services/reports";
import WebView from "react-native-webview";
import JReportInputs from './JReportInputs';
import * as Constants from "../../statics/constants";
import { clearConfigCache } from 'prettier';


export default function JreportsView(props) {

    const reportsService = new ReportsService();
    const webviewRef = React.createRef();
    const [reportSecureKey, setReportSecureKey] = useState(null);

    useEffect(() => {
        getReportSecureKey();
    }, [props.currentSelectedReport])


    // useEffect(() => {
    //     getReportSecureKey();
    // }, [])


    // console.log(reportSecureKey)

    //------GETS A NEW TOKEN. NEW TOKEN (SECUREKEY) NEEDED ON EVERY REQUEST -- // 

    const apiRoute = `https://zeqcnexapidev.admis.com/NexusSecureToken/api/LogiReport/GetReportsSecureKey?reportName=${props.currentSelectedReport}`;

    const useApi = async (token) => {
        let response = await fetch(apiRoute, { headers: { "Content-Type": "text/json", Authorization: "Bearer " + token } }).then(response => response);
        let secureKey = await response.text().then(res => res);
        return secureKey;
    };

    const getReportSecureKey = async () => {
        let secureKey = await reportsService.getAccessToken().then(token => useApi(token));
        setReportSecureKey(secureKey);
    }


    console.log(reportSecureKey)


    //------------INJECTING A SCRIPT --------------//

    //Gets injected before loading a report. 
    const injectFirstScript = `(function(){
        const script = document.createElement("script");
        script.id = "j$vm";
        script.src = "` + "https://zreportsuat.admis.com/" + `webos/jsvm/lib/jreportapi.js";
        script.async = true;
        document.body.append(script);
    })();
    `
    //some reports require some fields not to be empty;
    const checkRequiredFields = (paramsObj) => {
        let currentSelectedReport = props.currentSelectedReport;
        if ((currentSelectedReport === "Yearly_Statement"
            || currentSelectedReport === "MA45")
            && paramsObj.P_Office === "%") {

            return alert("Office is required. Please enter the office number.");

        } else if ((currentSelectedReport === "Position_File"
            || currentSelectedReport === "Bust_Makeup_Leave_Report"
            || currentSelectedReport === "Margin_SPAN")
            && paramsObj.P_Account === "%"
            && paramsObj.P_Office === "%"
            && paramsObj.P_SalesCode === "%") {

            return alert("Please fill up at least one input field.")

        } else return true;
    }

    const injectScriptFunc = (paramsObj) => {

        let fileExtension = props.currentSelectedReport === "Warehouse_Receipt" ? ".wls" : ".cls";
        let selectedReportName = props.currentSelectedReport.includes("-Emp") ? props.currentSelectedReport.replace("-Emp", "")
            : props.currentSelectedReport;
            

        let injectScript = ` 
        (function(){
            try{
            // eslint-disable-next-line
            let Factory = com.jinfonet.api.AppFactory;
            
            let server = {
                url:"https://zreportsuat.admis.com/jinfonet/runReport.jsp", 
                jrauth_key:"` + reportSecureKey + `"
            };
            let rptRes = {name:"/NexusReports/Balance_Summary_Report.cls"};
            let catRes =  {name:"/NexusReports/nexus.cat"};
            let params =  {
                Domain: "https://devnexus.admis.com",
                P_Account: "24036",
                P_BusinessDate: "//",
                P_EndDate: undefined,
                P_Firm: "%",
                P_FromDate: undefined,
                P_ReportDate: "//",
                P_SalesCode: "%",
                P_UseRelated: 1,
                P_office: "002",
                UserLogin: "khum.regmi@admis.com"
            };    
            Factory.runReport(server, rptRes, catRes, params, "jReports");
            window.scrollTo(0,0);   //moves the jreport window to the top corner
        }catch(err){
            window.alert(err)
        }
        })();
        true;
        `;
        return injectScript;
    }

    const getJreportsHandler = (paramsObj) => {
        // getReportSecureKey();
        let isRequiredFieldsCorrect = checkRequiredFields(paramsObj);
        if (isRequiredFieldsCorrect && reportSecureKey) {
            if (webviewRef.current) webviewRef.current.injectJavaScript(injectScriptFunc(paramsObj));
        }
    }
    return (<>
        <JReportInputs currentSelectedReport={props.currentSelectedReport} getJreportsHandler={getJreportsHandler} />
        <WebView
            ref={webviewRef}
            originWhitelist={["*"]}
            style={{ flex: 1, marginTop: 4 }}
            source={props.isAndroid ? { uri: "file:///android_asset/Jreports.html" } : require("./Jreports.html")}
            javaScriptEnabled={true}
            injectedJavaScript={injectFirstScript}
            onMessage={(event) => { }}
            domStorageEnabled={true}
            onNavigationStateChange={(e) => true}
            setSupportMultipleWindows={true}
            thirdPartyCookiesEnabled={true}
            mixedContentMode="always"
            cacheEnabled={true}
            injectedJavaScriptBeforeContentLoaded={`
             window.onerror = function(message, sourcefile, lineno, colno, error) {
               alert("Message: " + message + " - Source: " + sourcefile + " Line: " + lineno + ":" + error);
               return true;
             };
             true;
           `}
            onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
            }}
        />
    </>
    )
}
