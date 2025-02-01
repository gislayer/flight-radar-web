import axios, { AxiosResponse } from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { clearUser } from '../store/reducers/user';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import { message } from 'antd';
const VITE_API_URL = import.meta.env.VITE_API_URL;

interface GLConstructor {
  newurl?: string;
}

interface GLResponse {
  data: any;
}

class API {
  private dispatch = useDispatch();
  private token = useSelector((state: RootState) => state.user.token);
  private user = useSelector((state: RootState) => state.user.user);
  private tenant_id = 1;
  private url = `${VITE_API_URL}/api`;
  private navigate = useNavigate();

  constructor({ newurl }: GLConstructor) {
    this.url = newurl ?? this.url;
  }

  

  private getHeader() {
    return {
      Authorization: `Bearer ${this.token}`,
      'X-Tenant-ID': this.tenant_id,
    };
  }

  async delete(endpoint: string): Promise<any> {
    try {
      const header = this.getHeader();
      const response: AxiosResponse<GLResponse> = await axios.delete(`${this.url}/${endpoint}`, { headers: header });
      return response.data.data;
    } catch (err: any) {
      this.errHandler(err);
      return false;
    }
  }

  async patch(endpoint: string, data: any): Promise<any> {
    try {
      const header = this.getHeader();
      const response: AxiosResponse<GLResponse> = await axios.patch(`${this.url}/${endpoint}`, data, { headers: header });
      return response.data.data;
    } catch (err: any) {
      this.errHandler(err, data);
      return false;
    }
  }

  async upload(file: File): Promise<any> {
    try {
      const header:any = this.getHeader();
      header['Content-Type'] = 'multipart/form-data';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      const response: AxiosResponse<GLResponse> = await axios.post(`${this.url}/files`, formData, { headers: header });
      return response.data.data;
    } catch (err: any) {
      this.errHandler(err);
      return false;
    }
  }

  async post(endpoint: string, data: any): Promise<any> {
    try {
      const header = this.getHeader();
      const response: AxiosResponse<GLResponse> = await axios.post(`${this.url}/${endpoint}`, data, { headers: header });
      return response.data.data;
    } catch (err: any) {
      this.errHandler(err, data);
      return false;
    }
  }

  async get(endpoint: string): Promise<any> {
    try {
      const header = this.getHeader();
      const response: AxiosResponse<GLResponse> = await axios.get(`${this.url}/${endpoint}`, { headers: header });
      return response.data.data;
    } catch (err: any) {
      this.errHandler(err);
      return false;
    }
  }

  async getFile(endpoint: string): Promise<any> {
    try {
      const header = this.getHeader();
      const response: AxiosResponse<GLResponse> = await axios.get(`${this.url}/${endpoint}`, { headers: header });
      return response.data;
    } catch (err: any) {
      this.errHandler(err);
      return false;
    }
  }

  async overPassRequest(types:string[]){
    var body = {
      data:`[out:json]; ${types.join('')}`
    };
    var data= await axios.post('https://overpass-api.de/api/interpreter', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    if(data.status==200){
      return data.data.elements;
    }else{
      return false;
    }
  }

  private logOut(){
    this.clearUser();
    this.navigate('/');
    return false;
  }

  private goToVerification(email:string){
    this.navigate({
      pathname:'/verification',
      search: createSearchParams({
        email:email
      }).toString()
    });
    return false;
  }

  private errHandler(err: any, data?:any) {
    if (err.response.status === 401) {
      var messages = ['Unauthorized','Invalid token'];
      if(messages.includes(err.response.data.message)){
        this.logOut();
      }
      if(err.response.data.message ==='User account is not activated'){
        this.clearUser();
        return this.goToVerification(data.email);
      }
    }else if(err.response.status === 500){
      if (err.response.data.message === 'jwt expired') {
        this.logOut();
      }
    }
    message.error(err.response.data.message)
    return false;
  }

  private clearUser() {
    this.dispatch(clearUser());
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  async CRUD(crud: 'C' | 'R' | 'U' | 'D', endpoint: string, data?: any, id?: string): Promise<any> {
    switch (crud) {
      case 'C':
        return await this.post(endpoint, data);
      case 'R':
        return await this.get(endpoint);
      case 'U':
        return await this.patch(`${endpoint}/${id}`, data);
      case 'D':
        return await this.delete(`${endpoint}`);
      default:
        throw new Error('Invalid CRUD operation');
    }
  }
}

export default API;
