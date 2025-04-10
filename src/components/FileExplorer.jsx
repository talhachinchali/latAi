import { useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import "./Steps.css"
import JavascriptIcon from '@mui/icons-material/Javascript';
import HtmlIcon from '@mui/icons-material/Html';
import CssIcon from '@mui/icons-material/Css';
import DescriptionIcon from '@mui/icons-material/Description';

function FileExplorer({ onFileSelect, files, setFiles, selectedFile }) {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src']));

  const getFileIcon = (name, type) => {
    if (type === 'folder') return null;
    
    const extension = name.split('.').pop().toLowerCase();
    switch (extension) {
      // case 'html':
      //   return <HtmlIcon fontSize="small" className="text-orange-600" />;
      // case 'css':
      //   return <CssIcon fontSize="small" className="text-blue-600" />;
      // case 'js':
      // case 'jsx':
      //   return <JavascriptIcon fontSize="small" className="text-yellow-500" />;
      // case 'json':
      //   return <DescriptionIcon fontSize="small" className="text-yellow-300" />;
      // case 'md':
        //   return <DescriptionIcon fontSize="small" className="text-gray-400" />;
        default:
          return <InsertDriveFileOutlinedIcon  fontSize="xs" className="text-gray-400" />;
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderTree = (tree, path = '') => {
    return Object.entries(tree)
      .filter(([name, node]) => {
        // Filter out files with no name or no content
        return node.type === 'folder' || (name && node.content);
      })
      .sort(([nameA, nodeA], [nameB, nodeB]) => {
        if (nodeA.type === 'folder' && nodeB.type !== 'folder') return -1;
        if (nodeA.type !== 'folder' && nodeB.type === 'folder') return 1;
        return nameA.localeCompare(nameB);
      })
      .map(([name, node]) => {
        const fullPath = path ? `${path}/${name}` : name;
        
        if (node.type === 'folder') {
          const isExpanded = expandedFolders.has(fullPath);
          return (
            <div key={fullPath} className="folder overflow-auto  scrollbar-hide">
              <div 
                className="flex items-center gap-1 px-2 py-1 hover:bg-gray-800 cursor-pointer"
                onClick={() => toggleFolder(fullPath)}
              >
                <span className="text-gray-500">
                  {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                </span>
                <span>{getFileIcon(name, 'folder')}</span>
                <span className="text-gray-300 text-sm">{name}</span>
              </div>
              {isExpanded && (
                <div className="ml-4">
                  {renderTree(node.children, fullPath)}
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={fullPath}
            className="flex w-[fit-content] ms-center gap-1 px-2 py-1 hover:bg-gray-800 cursor-pointer items-center"
            onClick={() => onFileSelect({ name, path: fullPath, content: node.content })}
            style={{ backgroundColor: selectedFile?.path === fullPath ? 'black' : 'transparent' }}
          >
            {/* <span className="invisible"><KeyboardArrowRightIcon fontSize="small" /></span> */}
           {getFileIcon(name, 'file')}
            <span className="text-gray-300 text-xs">{name}</span>
          </div>
        );
      });
  };

  return (
    <div className="bg-[#262626] text-sm h-full overflow-auto mt-2 scrollbar-hide max-h-[90%]">
      {renderTree(files)}
    </div>
  );
}

export default FileExplorer; 