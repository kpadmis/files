import axios from "axios";
import AuthService from "../auth"
import * as Constants from "../../statics/constants"
class Reports {
  getKey = (logiBaseUrl, isInfo = true) => {
    return AuthService.b2cService.assureToken(AuthService.credentials)
      .then(accessToken => {


        // const apiRoute = Constants.secureKeyRoot
        // console.log(apiRoute)
        
        //LogiInfo
        //1. Oak Open Order
      //  const logiApi = "https://zeqcnexapidev.admis.com/NexusSecureToken/api/LogiReport/GetLogiSecureKey?logiBaseUrl=https://zreportsinfouat.admis.com/MobileInfoDev&domain=https://devnexus.admis.com/"
       
       //2. Prelim
      //  const logiApi = "https://zeqcnexapidev.admis.com/NexusSecureToken/api/LogiReport/GetLogiSecureKey?logiBaseUrl=https://zreportsinfouat.admis.com/MobileInfoDev&domain=https://devnexus.admis.com/"

        //LogiReports
       const logiApi = "https://zeqcnexapidev.admis.com/NexusSecureToken/api/LogiReport/GetReportsSecureKey?reportName=Balance_Summary_Report"
       

        const headers = {
          Authorization: "Bearer " + accessToken
        };

        return axios.get(logiApi, {
          headers,
        })

      })
  }

  getAccessToken = () => {
    return AuthService.b2cService.assureToken(AuthService.credentials)
      .then(accessToken => accessToken).catch(err => err)
  }
}

export default Reports;
