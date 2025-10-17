import {
  Box,
  Button,
  Snackbar,
  CircularProgress,
  Typography,
} from "@mui/material";

import MuiAlert from "@mui/material/Alert";
import React, { useEffect, useState } from "react";

import "./App.css";

import logoImg from "./auttobahn.png";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ZOHO = window.ZOHO;

function App() {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false); //initializing widget
  const [entity, setEntity] = useState(); //module entity
  const [entityId, setEntityId] = useState(); //module id
  const [woDetails, setWoDetails] = useState(null);

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [severity, setSeverity] = useState("error");

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenSnackbar(false);
  };

  useEffect(() => {
    //rendered once during widget first load
    ZOHO.embeddedApp.on("PageLoad", function (data) {
      if (data?.ButtonPosition) {
        setEntityId(data?.EntityId?.[0]);
      } else {
        setEntityId(data?.EntityId);
      }
      setEntity(data?.Entity);
    });

    ZOHO.embeddedApp.init().then(() => {
      ZOHO.CRM.UI.Resize({ height: "350", width: "800" }).then(function (data) {
        // console.log(data)
      });
      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    // gets the vendor record
    async function fetchData() {
      if (entity && entityId && initialized) {
        await ZOHO.CRM.API.getRecord({
          Entity: entity,
          RecordID: entityId,
        }).then(function (data) {
          const recordData = data?.data?.[0] || {};
          setWoDetails(recordData);
        });
      }
    }

    fetchData();
  }, [entity, entityId, initialized]);

  const handleCancel = () => {
    // cancel button action
    ZOHO.CRM.UI.Popup.close().then(function (data) {
      // console.log(data);
    });
  };

  const handleProceed = async () => {
    setLoading(true);
    const handleCleanAmendmentSection = async () => {
      const config = {
        Entity: entity,
        APIData: {
          id: entityId,
          Amendment_No: null,
          New_End_Date: null,
          New_Creator_TC: null,
          New_Amount: null,
          Resources: null,
          amendment_writer_id: null,
          Effective_Date: null,
          amendment_sign_id: null,
          Amendment_Request: false,
        },
        Trigger: [],
      };
      await ZOHO.CRM.API.updateRecord(config).then(async function (data) {
        if (data?.data[0]?.message === "record updated") {
          setSeverity("success");
          setSnackbarMessage("Cancelled Successfully..");
          setOpenSnackbar(true);
          setTimeout(() => {
            ZOHO.CRM.BLUEPRINT.proceed();
          }, 2000);
        } else {
          setLoading(false);
          setSeverity("error");
          setSnackbarMessage("Something went wrong..Please try again later!!!");
          setOpenSnackbar(true);
        }
      });
    };
    let sign_id = woDetails?.amendment_sign_id;
    if (sign_id) {
      let recall_req_data = {
        method: "POST",
        url: "https://sign.zoho.com/api/v1/requests/" + sign_id + "/recall",
        param_type: 2,
      };

      await ZOHO.CRM.CONNECTION.invoke("zoho_sign_conn", recall_req_data).then(
        async function (resp) {
          if (resp?.details?.statusMessage?.code === 0) {
            await handleCleanAmendmentSection();
          } else {
            setSeverity("error");
            setSnackbarMessage("Something went wrong. Try again later.");
            setOpenSnackbar(true);
            setLoading(false);
          }
        }
      );
    } else {
      await handleCleanAmendmentSection();
    }
  };

  return (
    <Box>
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <img height={60} src={logoImg} alt="logo" />
      </Box>
      {woDetails ? (
        <Box>
          <Box sx={{ width: "90%", mx: "auto" }}>
            <Box sx={{ mt: 7, mx: "auto" }}>
              {woDetails?.Amendment_Stage !== "Collect Amendment Details" && (
                <Typography>
                  If you cancel now the agreement sent for Signature will be
                  voided and no new agreement will be sent. You will need to
                  Initiate an Amendment.
                  <br /> <br /> Do you wish to proceed ?
                </Typography>
              )}
              {woDetails?.Amendment_Stage === "Collect Amendment Details" && (
                <Typography>
                  If you cancel now, the Process will be cancelled. You will
                  need to Initiate an Amendment again.
                  <br /> <br /> Do you wish to proceed ?
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                ml: "1rem",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                mt: 2,
              }}
            >
              <Button
                sx={{ width: 130 }}
                variant="outlined"
                onClick={handleCancel}
              >
                Cancel
              </Button>

              <Button
                sx={{ width: 130 }}
                variant="contained"
                disabled={loading}
                onClick={handleProceed}
              >
                Proceed
                {loading && (
                  <CircularProgress sx={{ color: "white", ml: 1 }} size={22} />
                )}
              </Button>
            </Box>
          </Box>
          <Snackbar
            open={openSnackbar}
            autoHideDuration={4500}
            onClose={handleCloseSnackbar}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={severity}
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            height: "60vh",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontSize: "22px", fontWeight: "bold" }}>
            Please wait while fetching data...
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default App;
