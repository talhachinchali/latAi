function parseXMLContent(xmlContent) {
    // Extract title from boltArtifact
    const titleMatch = xmlContent?.match(/title="([^"]*)"/)
    const title = titleMatch ? titleMatch[1] : ''
  
    // Parse individual actions
    const actions = []
    actions.push({
      title: title,
      type: 'title',
      path: '',
      content: '',
      status: 'completed'
    })
    const actionRegex = /<boltAction type="([^"]*)" filePath="([^"]*)">([\s\S]*?)<\/boltAction>/g
    const shellRegex = /<boltAction type="shell">([\s\S]*?)<\/boltAction>/g
    const postArtifactTextMatch = xmlContent?.match(/<\/boltArtifact>\s*([\s\S]*)/)
    // Parse file actions
    let match
    while ((match = actionRegex.exec(xmlContent)) !== null) {
        // console.log(match,"match----------------");
      actions.push({
        title: `Create ${match[2]}`,
        type: match[1],
        path: match[2],
        content: match[3].trim(),
        status: 'pending'
      })
    }
  
    // Parse shell commands
    while ((match = shellRegex.exec(xmlContent)) !== null) {
      actions.push({
        title,
        type: 'shell',
        path: '',
        content: match[1].trim(),
        status: 'pending'
      })
    }
    if(postArtifactTextMatch?.[1]){
      actions.push({
        title: 'Add Description',
        type: 'description',
        path: '',
        content: postArtifactTextMatch[1].trim(),
        status: 'completed'
      })
    }
  
    return actions
  }
  
  export default parseXMLContent