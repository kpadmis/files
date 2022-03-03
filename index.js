import React from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableHighlight,
  Platform,
} from "react-native";
import Modal from "react-native-modal";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import Topbar from "../../components/topBar";
import * as Constants from "../../statics/constants";
import Config from "../../statics";
import { connect } from "react-redux";
import { withTheme } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import {
  postReportsReport,
  postReportsSecureKey,
  postAppFormAccount,
  postAppBackPage,
  postUserSettingsReports,
  postUserSettingsReportsMyList
} from "../../redux/actions";
import UserSettingsService from "../../services/userSettings";
import ReportsService from "../../services/reports";
import PermissionsService from "../../services/permissions";
import URL from "url-parse";
import { withNavigation } from "react-navigation";
import Orientation from "react-native-orientation";
import Logger from "../../services/logging";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AuthService from "../../services/auth";
import { defaultReportList, jReportsList } from './reportsList';
import JreportsView from "./JreportsView";



class Reports extends React.Component {
  reportsService;
  permissionsService;
  userSettingsService;
  constructor(props) {
    super(props);
    this.reportsService = new ReportsService();
    this.permissionsService = new PermissionsService();
    this.userSettingsService = new UserSettingsService();
    this.state = {
      ModalVisible: false,
      Reports: [],
      Rotated: false,
      EditingList: false,
      jReportsCollection: [],
      logiReportsCollection: []
    };
  }
  UNSAFE_componentWillMount() {
    // this.getReports();
    Orientation.addOrientationListener(this._onOrientationDidChange);
    this.props.navigation.addListener("didBlur", (payload) => {
      if (!Platform.isPad) {
        Orientation.lockToPortrait();
      }
    });
    this.props.navigation.addListener("didFocus", (payload) => {
      Orientation.unlockAllOrientations();
    });
  }
  componentDidMount() {
    this.getReports();
    //loads user config settings. Which reports to show on the side menu.
    this.userSettingsService
      .getApp(AuthService.b2cService.getUser().emails[0], Config.reportsId)
      .then((response) => {
        if (response.data && response.status == 200) {
          if (response.data.local.customData) {
            this.props.postUserSettingsReportsMyList(response.data.local.customData.MyList);
          }
        }
      })
      .catch((error) => {
        console.log("error get User", error)
        Logger.LogError(
          "Reports",
          "APIError",
          "Error getting user settings: " + error.toString()
        );
      });
  }
  componentWillUnmount() {
    Orientation.removeOrientationListener(this._onOrientationDidChange);
  }
  _onOrientationDidChange = (orientation) => {
    if (
      orientation == "LANDSCAPE-LEFT" ||
      orientation == "LANDSCAPE-RIGHT" ||
      orientation == "LANDSCAPE"
    ) {
      if (this.state.Rotated == false) {
        this.setState({ Rotated: true });
      }
    } else if (this.state.Rotated == true) {
      this.setState({ Rotated: false });
    }
  };
  bringScreenToOrigin() {
    this.webview.injectJavaScript(`window.scrollTo(0,0);`);
  }
  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.getReportsReport != null &&
      this.props.getReportsReport != null &&
      this.props.getReportsReport.permissionName !=
      prevProps.getReportsReport.permissionName
    ) {
      Logger.LogInformation(
        "Reports",
        "ReportsChange",
        "Report changed to: " +
        this.props.getReportsReport.permissionName.toString()
      );
      this.update();
    }
    if (
      prevProps.getReportsReport == null &&
      this.props.getReportsReport != null
    ) {
      this.update();
    }
  }

  update() {
    //we dont want to inject logi report's script, if report is Jreport
    const { permissionName } = this.props.getReportsReport;
    console.log('info name ' , permissionName)
    if (!jReportsList.find(el => el.name === permissionName)) {
    this.reportsService
      .getKey(Constants.reportsParamUrl)
      .then((response) => {
          
        if (response.status == 200) {
          this.props.postReportsSecureKey(response.data);
          this.webview.injectJavaScript(
            `
    if (EmbeddedReporting.get("dvEmbedStudio")) {
      EmbeddedReporting.get(
        "dvEmbedStudio"
      ).applicationUrl = "` +
      "https://zreportsinfouat.admis.com/MobileInfoDev" +
            `";
      EmbeddedReporting.get("dvEmbedStudio").secureKey = "` +
            response.data +
            `";
      EmbeddedReporting.get("dvEmbedStudio").rdNewBookmark = "True";
      EmbeddedReporting.get("dvEmbedStudio").report = "Live.` +
            `${permissionName}` +
            `";
      EmbeddedReporting.get("dvEmbedStudio").loadReport();
    } else {
      var EmbedOptions = {
        applicationUrl: "` +
        "https://zreportsinfouat.admis.com/MobileInfoDev" +
            `",
        report: "Live.` +
            `${permissionName}` +
            `",
        autoSizing: "all",
        secureKey: "` +
            response.data +
            `",
        linkParams: {
          rdNewBookmark: "True"
        }
      };
      EmbeddedReporting.create("dvEmbedStudio", EmbedOptions);
      EmbeddedReporting.keepSessionsAlive("SessionRenew", 60000);
    }
        `
          );
        }
      })
      .catch((error) => {
        console.log("failed to get the key :", error)
        Logger.LogError(
          "Reports",
          "APIError",
          "Error getting key and updating webview: " + error.toString()
        );
      });
    }
  }
  getSecureKey() {
    this.reportsService
      .getKey(Constants.reportsParamUrl)
      .then((response) => {
        if (response.status == 200) {
          this.props.postReportsSecureKey(response.data);
        }
      })
      .catch((error) => {
        console.log("get secure key failed : ", error)
        Logger.LogError(
          "Reports",
          "APIError",
          "Error getting key: " + error.toString()
        );
      });
  }
  onLoad() {
    this.webview.injectJavaScript(
      `setTimeout(function(){
        let report = "Live." + "` +
      this.props.getReportsReport.permissionName +
      `";
        if (EmbeddedReporting.get("dvEmbedStudio")) {
          EmbeddedReporting.get(
            "dvEmbedStudio"
          ).applicationUrl = "` +
      Constants.reportsParamUrl +
      `";
          EmbeddedReporting.get("dvEmbedStudio").secureKey = "` +
      this.props.getReportsSecureKey +
      `";
          EmbeddedReporting.get("dvEmbedStudio").rdAgReset = "True";
          EmbeddedReporting.get("dvEmbedStudio").rdAgRefreshData = "True";
          EmbeddedReporting.get("dvEmbedStudio").rdNewBookmark = "True";
          EmbeddedReporting.get("dvEmbedStudio").report = report;
          EmbeddedReporting.get("dvEmbedStudio").loadReport();
        } else {
          var EmbedOptions = {
            applicationUrl: "` +
      Constants.reportsParamUrl +
      `",
            report: report,
            autoSizing: "all",
            secureKey: "` +
      this.props.getReportsSecureKey +
      `",
            linkParams: {
                rdNewBookmark: "True",
                rdShowWait: "True",
                rdAgReset: "True",
                rdAgRefreshData: "True",
            }
          };
          EmbeddedReporting.create("dvEmbedStudio", EmbedOptions);
          EmbeddedReporting.keepSessionsAlive("SessionRenew", 60000);
        }},3000)
        `
    );
  }
  urlChange(event) {
    if (event.url.includes("reports.html")) {
      return true;
    }
    var url = URL(event.url, true);
    if (url.pathname.startsWith("/accountsnapshots/AccountNumber=")) {
      var officeAccount = url.pathname.substring(32, 40);
      this.props.postAppFormAccount(officeAccount);
      this.props.navigation.navigate("AccountSnapshots");
      this.webview.stopLoading();
      this.props.postAppBackPage({ route: "Reports", title: "Reports" });
      return false;
    }
    if (!event.url.includes("rdReport")) {
      return true;
    }
    return true;
  }

  //----REPORTS LIST ------//

  reportListEdited(report) {
    let reports = this.getReportsList();
    if (!reports || reports.length == 0) {
      reports = [];
    }
    if (
      reports.filter((x) => x.permissionName == report.permissionName).length >
      0
    ) {
      reports = reports.filter(
        (x) => x.permissionName != report.permissionName
      );
    } else {
      reports.push(report);
    }
    this.userSettingsService
      .postUpdate(
        AuthService.b2cService.getUser().emails[0],
        Config.reportsId,
        { ...this.props.getUserSettingsReports, MyList: reports }
      )
      .catch((error) => {
        Logger.LogError(
          "Reports",
          "APIError",
          "Error posting user reports updated selection: " + error.toString()
        );
      });
    this.props.postUserSettingsReports({
      ...this.props.getUserSettingsReports,
      MyList: reports,
    });
  }


  //function returns a list of reports that user has a permission to view.
  getReports() {
    this.permissionsService
      .getDetailedPermissions(Config.reportsId)
      .then((response) => {
        if (response.status == 200) {
          this.setState({ Reports: response.data.permission });
        }
      })
      .catch((error) => {
        Logger.LogError(
          "Reports",
          "APIError",
          "Error getting reports: " + error.toString()
        );
      });
  }

  getEditingReportsList() {
    let reports = this.getReportsList();
    reports = reports.map((x) => {
      x.selected = true;
      return x;
    });
    for (let i = 0; i < this.state.Reports.length; i++) {
      if (
        reports.filter(
          (x) => x.permissionName == this.state.Reports[i].permissionName
        ).length == 0
      ) {
        let report = this.state.Reports[i];
        report.selected = false;
        reports.push(report);
      }
    }
    //sorts alphabetically, I dont know if its needed.
    reports = reports.sort((a, b) => {
      if (a.selected && b.selected) {
        return a.permissionName > b.permissionName ? 1 : -1;
      }
      if (a.selected) {
        return -1;
      }
      if (b.selected) {
        return 1;
      }
      return a.permissionName > b.permissionName ? 1 : -1;
    });
    return reports;
  }
  getReportsList() {
    let reportsList = []
    if (
      this.props.getUserSettingsReports &&
      this.props.getUserSettingsReports.MyList &&
      this.props.getUserSettingsReports.MyList.length > 0
    ) {
      reportsList = this.props.getUserSettingsReports.MyList.sort((a, b) =>
        a.permissionName > b.permissionName ? 1 : -1
      );
    } else {
      reportsList = defaultReportList
    }
    reportsList = reportsList.filter(
      (x) =>
        this.state.Reports.filter(
          (a) => a.permissionID == x.permissionID
        ).length > 0
    );
    return reportsList
  }
  renderReportItem(item, index, section) {
    return (
      <TouchableHighlight
        style={{
          borderColor: this.props.theme.border,
          borderBottomWidth: 1,
          height: 40,
          backgroundColor: this.props.theme.primaryBackground,
          justifyContent: "center",
        }}
        underlayColor={this.props.theme.underlayColor}
        onPress={() => {
          this.setState({ ModalVisible: false });
          this.props.postReportsReport(item);
          console.log(item)
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <View style={{ marginLeft: 30, marginRight: 20 }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  textAlign: "left",
                  fontSize: 14,
                  fontFamily: "Helvetica",
                  color: this.props.theme.primaryColor,
                }}
              >
                {item.permissionName.replace(/_/g, " ").replace(/-/g, "/")}
              </Text>
            </View>
          </View>
        </View>
      </TouchableHighlight>
    );
  }
  renderReportEditing(item, index, section) {
    return (
      <View
        key={item.permissionName}
        style={{
          borderColor: this.props.theme.border,
          borderBottomWidth: 1,
          height: 40,
          backgroundColor: this.props.theme.primaryBackground,
          justifyContent: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableHighlight
            underlayColor={this.props.theme.underlayColor}
            onPress={() => {
              this.reportListEdited(item);
            }}
          >
            <View
              style={{
                width: 25,
                justifyContent: "center",
                marginLeft: 10,
                marginRight: 10,
              }}
            >
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 16,
                  height: 16,
                  borderColor: this.props.theme.checkboxBorder,
                  borderWidth: item.selected ? 0 : 1,
                  borderRadius: 1,
                  backgroundColor: item.selected
                    ? this.props.theme.checkedColor
                    : this.props.theme.statementsTypeBackground,
                }}
              >
                {item.selected && (
                  <Image
                    style={{ width: 8, height: 6 }}
                    source={
                      this.props.getUserSettingsMobileTheme == "dark"
                        ? require("../../img/tick.png")
                        : require("../../img/tick.png")
                    }
                  />
                )}
              </View>
            </View>
          </TouchableHighlight>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <View style={{ marginLeft: 20, marginRight: 20 }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  textAlign: "left",
                  fontSize: 14,
                  fontFamily: "Helvetica",
                  color: this.props.theme.primaryColor,
                }}
              >
                {item.permissionName.replace(/_/g, " ").replace(/-/g, "/")}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
  renderReportsList() {

    if (this.state.EditingList) {
      return (
        <FlatList
          style={{ marginTop: 25 }}
          data={this.getEditingReportsList()}
          renderItem={({ item, index, section }) =>
            this.renderReportEditing(item, index, section)
          }
          keyExtractor={(item, index) => item.permissionName}
        />
      );
    } else {
      return (
        <FlatList
          style={{ marginTop: 25 }}
          data={this.getReportsList()}
          renderItem={({ item, index, section }) => this.renderReportItem(item, index, section)}
          keyExtractor={(item, index) => item.permissionName}
        />
      );
    }
  }
  renderReportSideMenuModal() {
    return (
      <Modal
        ref={(c) => {
          this._modal = c;
        }}
        animationIn="slideinleft"
        transparent={true}
        style={{ flex: 1, margin: 0, flexDirection: "row" }}
        visible={this.state.ModalVisible}
      >
        <SafeAreaView
          style={{
            flex: 3,
            maxWidth: 500,
            backgroundColor: this.props.theme.primaryBackground,
          }}
        >
          <View
            style={{
              height: 30,
              justifyContent: "center",
              marginTop: 15,
              marginBottom: 2,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: "600",
                overflow: "hidden",
                marginLeft: 20,
                color: this.props.theme.primaryColor,
              }}
            >
              REPORTS
            </Text>
            <TouchableHighlight
              underlayColor={this.props.theme.underlayColor}
              style={{ padding: 5 }}
              onPress={() =>
                this.setState({ EditingList: !this.state.EditingList })
              }
            >
              <MaterialIcons
                name={this.state.EditingList ? "check" : "edit"}
                size={this.state.EditingList ? 16 : 16}
                style={{ color: this.props.theme.primaryColor, marginLeft: 10 }}
              />
            </TouchableHighlight>
            <View style={{ flex: 1 }} />
            <View style={{ position: "absolute", right: 17 }}>
              <TouchableHighlight
                underlayColor={this.props.theme.underlayColor}
                onPress={() => {
                  this.setState({ ModalVisible: false });
                }}
              >
                <MaterialIcon
                  style={{ color: this.props.theme.arrowColor }}
                  size={23}
                  name="clear"
                />
              </TouchableHighlight>
            </View>
          </View>
          {this.renderReportsList()}
        </SafeAreaView>
        <View style={{ flex: 1, backgroundColor: "black", opacity: 0.4 }}>
          <TouchableHighlight
            style={{ width: "100%", height: "100%" }}
            onPress={() => this.setState({ ModalVisible: false })}
          >
            <View />
          </TouchableHighlight>
        </View>
      </Modal>
    );
  }
  renderTopBar() {
    if (!this.state.Rotated || Platform.isPad) {
      return (
        <View
          style={{
            flex: 0,
            flexBasis: 40,
            height: 40,
            justifyContent: "center",
            color: this.props.theme.primaryColor,
            backgroundColor: this.props.theme.tertiaryBackground,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                justifyContent: "center",
                flexDirection: "row",
                backgroundColor: this.state.FavoritesModalVisible
                  ? this.props.theme.primaryBackground
                  : this.props.theme.tertiaryBackground,
                borderRadius: 2,
                borderColor: this.props.theme.border,
                borderWidth: this.state.FavoritesModalVisible ? 1 : 0,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  marginRight: 7,
                  marginLeft: 5,
                  fontSize: 12,
                  color: this.props.theme.primaryColor,
                }}
              >
                {this.props.getReportsReport != null
                  ? this.props.getReportsReport.permissionName
                    .replace(/_/g, " ")
                    .replace(/-/g, "/")
                  : ""}
              </Text>
            </View>
          </View>
          <View style={{ position: "absolute", left: 15 }}>
            <TouchableHighlight
              underlayColor={this.props.theme.underlayColor}
              onPress={() => {
                this.setState({ ModalVisible: true });
              }}
            >
              <Image
                style={{ width: 21, height: 21 }}
                source={
                  this.props.getUserSettingsMobileTheme == "dark"
                    ? require("../../img/darksearch.png")
                    : require("../../img/search.png")
                }
              />
            </TouchableHighlight>
          </View>
          {this.renderReportSideMenuModal()}
        </View>
      );
    } else {
      return <View />;
    }
  }
  renderReport() {
    const isAndroid = Platform.OS === "android";
    //we look into the list of Jreports, if we find it there we render jReports. otherwise Logi reports.
    if (this.props.getReportsReport && jReportsList.find(el => el.name === this.props.getReportsReport.permissionName)) {
      return (
        <JreportsView isAndroid={isAndroid} currentSelectedReport={this.props.getReportsReport.permissionName}
          userName={this.props.getUserUserName}
        />)
    } else {
      //By always loading this page before we actually load a report, we allow logi to save cookies
      //IOS doesn't allow a page to save cookies if it's never been explicitly visited, but this page appears as
      //an iframe in logi and needs to be able to save cookies
      return (
        this.props.getReportsReport == null ? (
          <>
            <WebView
              style={{ flex: 1, visible: false, height: 0, width: 0 }}
              originWhitelist={["*"]}
              ref={(c) => {
                this.webview = c;
              }}
              source={{ uri: "https://zreportsuat.admis.com/jinfonet/runReport.jsp" }}
              // source={{ uri: Constants.reportsParamUrl + "rdPage.aspx" }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              cacheEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              mixedContentMode="always"
              allowUniversalAccessFromFileURLs={true}
            />
            <WebView
              style={{ flex: 1, visible: false, height: 0, width: 0 }}
              originWhitelist={["*"]}
              ref={(c) => {
                this.webview = c;
              }}
              // source={{ uri: "https://zreportsuat.admis.com/jinfonet/runReport.jsp" }}
              source={{ uri: Constants.reportsParamUrl + "rdPage.aspx" }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              cacheEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              mixedContentMode="always"
              allowUniversalAccessFromFileURLs={true}
            />
          </>
        ) :
          <WebView
            onLayout={() => {
              this.bringScreenToOrigin();
            }}
            style={{ flex: 1 }}
            originWhitelist={["*"]}
            ref={(c) => {
              this.webview = c;
            }}
            source={
              isAndroid
                ? { uri: "file:///android_asset/reports.html" }
                : require("./reports.html")
            }
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={true}
            sharedCookiesEnabled={true}
            setSupportMultipleWindows={false}
            thirdPartyCookiesEnabled={true}
            mixedContentMode="always"
            useWebkit={false}
            allowUniversalAccessFromFileURLs={true}
            onLoad={() => {
              this.onLoad();
            }}
            onNavigationStateChange={(e) => {
              this.urlChange(e);
            }}
            onShouldStartLoadWithRequest={(e) => {
              return this.urlChange(e);
            }}
          />
      );
    }
  }
  render() {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: this.props.theme.secondaryBackground,
        }}
      >
        {(!this.state.Rotated || Platform.isPad) && (
          <Topbar name={"Reports"} hideAccountName={true} />
        )}
        {this.renderTopBar()}
        {this.renderReport()}
      </SafeAreaView>
    );
  }
}
mapStateToProps = (state) => {
  return {
    getReportsReport: state.Reports.Report,
    getReportsSecureKey: state.Reports.SecureKey,
    getUserSettingsMobileTheme: state.User.Settings.Mobile.Theme,
    getUserSettingsReports: state.User.Settings.Reports,
    getUserUserName: state.User.UserName
  };
};
const mapDispatchToProps = {
  postReportsReport,
  postReportsSecureKey,
  postAppFormAccount,
  postAppBackPage,
  postUserSettingsReports,
  postUserSettingsReportsMyList
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withNavigation(withTheme(Reports)));
