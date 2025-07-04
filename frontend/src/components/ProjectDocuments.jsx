import React, { useState  , useEffect, use} from "react";
import { StatusCard } from "../components/StatusCard";
import { SearchBar } from "../components/SearchBar";
import TableData from "../components/TableData";
import axiosInstance from "../axiosInstance";
import { constructNow } from "date-fns";
import Pagination from "./Pagination";
import { Eye, Download } from "lucide-react";
import { getViewableDocumentUrl, getDownloadableDocumentUrl } from "../utils/supabaseUtils";
import { toast } from "sonner";


const defaultStatusData = [
  { title: "Initiation & Planning", count: 5, status: "completed" },
  { title: "Bidding", count: 7, status: "completed" },
  { title: "Pre- executing", count: 3, status: "completed" },
  { title: "Executing", count: 8, status: "warning" },
  { title: "Operation", count: 0, status: "default" },
  { title: "Total Documents", count: 21, status: "default" },
  { title: "Pending Approval", count: 2, status: "default" },
  { title: "Total Missing", count: 3, status: "default" },
];

const defaultDocumentsData = [
  {
    phaseName: "Initiation",
    documentName: "Signed Contract",
    fileName: "Project Contract.pdf",
    creationDate: "18-Jan-25",
    approvalStatus: "Approved",
    approvalDate: "19-Jan-25",
    approvedBy: "PMO- Ahmad Omar",
  },
  // ... Add more rows as needed
];

const columnSetting = [
  { columnName: "Phase", dbColumn: "project_phase", isVisible: true, isInput: false },
  { columnName: "Document Name", dbColumn: "document_name", isVisible: true, isInput: false },
  { columnName: "Template", dbColumn: "template_name", isVisible: true, isInput: false },
  { columnName: "Upload Date", dbColumn: "updated_at", isVisible: true, isInput: false },
  { columnName: "Actions", dbColumn: "actions", isVisible: true, isInput: false }
];

export default function ProjectDocuments({ className = "" , projectId , phaseName }) {
  const [tableData, setTableData] = useState(defaultDocumentsData);
  const [projectoverviewData, setProjectoverviewData ] = useState([]);
  const [projectDocumentsData ,setProjectDocumentsData ] = useState([]);
  const [pagination , setPagination] = useState([]);
  const phasesMap = {
    'Planning phase': 1, 
    'Bidding phase' : 2, 
    'Pre-execution phase' : 3, 
    'Execution phase' : 4,
    'Maintenance and operation phase' : 5,
    'Closed phase' : 6

  }
  let currentProjectPhaseIndex = phasesMap[`${phaseName+' phase'}`];
  let page = 1;
  let limit = 5;
  let searchTerm = ""
  let sortType ="updated_at";
  let sortOrder = "DESC";
  const sortTableData = (column, order) => {
    console.log(column);
    console.log(order);
    sortType = column;
    sortOrder = order;
    fetchProjectDocuments();
  };

  const getData = async () => {
    // Normally you'd fetch data here; for now use defaults
    setTableData(defaultDocumentsData);
  };

  const fetchProjectDocumentOverview = async()=>{
    const result = await axiosInstance.get(`/project-card/project-documents-overview/${projectId}`)
    console.log(result);
    const projectOverView = result.data.result.map((e)=>{
      return {...e , order : phasesMap[e.project_phase]}
    })
    console.log("*******************************************");
    console.log(projectOverView)
    console.log("the currrent phase order is "+currentProjectPhaseIndex+"   the phase name is "+phaseName);
    setProjectoverviewData(projectOverView);
  }
  // Utility function to get correct file URL
  const getCorrectFileUrl = (doc) => {
    // First try to use file_url which is the actual uploaded document
    if (doc.file_url && doc.file_url.trim() !== '') {
      return doc.file_url;
    }
    
    // As a fallback, use document_url which might be the template URL
    if (doc.document_url && doc.document_url.trim() !== '') {
      return doc.document_url;
    }
    
    return null;
  };

  const fetchProjectDocuments = async()=>{
    const result = await axiosInstance.get(`/project-card/project-documents/${projectId}?page=${page}&limit=${limit}&searchTerm=${searchTerm}&sortType=${sortType}&sortOrder=${sortOrder}`)
    console.log("the result of project documents:", result.data.result);
    
    // Debug the structure of the first document
    if (result.data.result && result.data.result.length > 0) {
      console.log("Sample document structure:", result.data.result[0]);
      console.log("File URL property present:", result.data.result.some(doc => doc.file_url));
      console.log("Document URL property present:", result.data.result.some(doc => doc.document_url));
      
      // Map the documents to ensure we have the correct file URL
      const mappedDocuments = result.data.result.map(doc => {
        return {
          ...doc,
          // Ensure we use the correct file URL for each document
          effective_file_url: getCorrectFileUrl(doc)
        };
      });
      
      setProjectDocumentsData(mappedDocuments);
      setTableData(mappedDocuments);
    } else {
      setProjectDocumentsData(result.data.result || []);
      setTableData(result.data.result || []);
    }
    
    setPagination(result.data.pagination);
  }
  const  refetchProjectDocuments = async(NavigatePage) =>{
    page = NavigatePage;
    fetchProjectDocuments();
  }
  const handleViewDocument = (doc) => {
    if (!doc || !doc.effective_file_url) {
      toast.error("No document URL available.");
      return;
    }

    try {
      // Use the specialized utility function for viewable URLs
      const viewUrl = getViewableDocumentUrl(doc.effective_file_url);
      
      console.log('Opening document URL:', viewUrl);
      
      // Open the document in a new tab
      window.open(viewUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error('Failed to open document. Please try again.');
    }
  };

  useEffect(()=>{
    fetchProjectDocumentOverview();
    fetchProjectDocuments();
  },[projectId])



  const handleSearch = (term)=>
  {
    searchTerm = term;
    fetchProjectDocuments();
    console.log(term);
  }
  
  return (
    <div className={`p-6 bg-white ${className}`}>
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {projectoverviewData.map((item, index) => (
          <StatusCard
            key={index}
            title={item.project_phase}
            count={item.submitted_documents}
            status={item.order>currentProjectPhaseIndex ? "error" : item.missing_documents != "0" ? 'warning':'completed' }
            statusText={item.order>currentProjectPhaseIndex ? "Phase not started yet" : item.missing_documents != "0" ? `${item.missing_documents} missing`:'' }
          />
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          placeholder="Search files"
          // onSearch={(query) => {
          //   const filtered = projectDocumentsData.filter((row) =>
          //     Object.values(row).some((value) =>
          //       String(value).toLowerCase().includes(query.toLowerCase())
          //     )
          //   );
          //   setTableData(filtered);
          // }}
          onSearch={(query)=>handleSearch(query)}
          className="max-w-md ml-auto"
        />
      </div>

      {/* Reusable Table */}
      <TableData
        getData={getData}
        tableData={tableData}
        tableName="ProjectDocuments"
        setTableData={setTableData}
        showDate={false}
        sortTableData={sortTableData}
        columnSetting={columnSetting}
        showActionButtons={true}
      />
      <Pagination pagination={pagination} getPageData={refetchProjectDocuments} />
    </div>
  );
}
