import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';
// Load the Kubernetes configuration from the default location
const kc = new KubeConfig();
kc.loadFromDefault();
// Make the API client
const k8sApi = kc.makeApiClient(CoreV1Api);
// Define the name of the job and the namespace it resides in
const jobName = 'hello-28557247';
const namespace = 'default'; // Replace with the actual namespace
// Function to get the logs of a job
export async function getJobLogs (jobName: string, namespace: string) {
  try {
    // First, get all the pods for the job
    const res = await k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, `job-name=${jobName}`);
    const pods = res.body.items;
    // Loop through the pods and get logs
    for (const pod of pods) {
      const podName = pod.metadata.name;
      const logStream = await k8sApi.readNamespacedPodLog(podName, namespace);
      console.log(`Logs for pod ${podName}:`);
      console.log(logStream.body);
      return logStream.body;
    }
  } catch (err) {
    console.error('Error fetching logs:', err);
  }
};
// Call the function to get the logs
// getJobLogs(jobName, namespace);