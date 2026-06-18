import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import "./styles.css";

const theme = {
  token: {
    colorPrimary: "#43b66a",
    colorSuccess: "#43b66a",
    colorWarning: "#fa9d2c",
    colorText: "#1f2329",
    colorTextSecondary: "#69717a",
    colorBorder: "#dcdfe6",
    borderRadius: 4,
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  components: {
    Button: {
      borderRadius: 4
    }
  }
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
